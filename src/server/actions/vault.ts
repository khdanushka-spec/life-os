"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser, getDbUser } from "@/server/db-user";
import { generateVaultReport } from "@/lib/ai/vault";
import type { ReportPeriod } from "@/generated/prisma/client";

function revalidateVault(subpath?: string) {
  revalidatePath("/vault");
  if (subpath) revalidatePath(subpath);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

// ---------- Notes ----------

const draftNoteSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(200),
  contentJson: z.unknown(),
  contentText: z.string().max(50000),
  category: optionalText(40),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

// Mirrors saveDraftEntryAction's shape (Journal) but uses getDbUser, not
// requireDbUser, deliberately from the start - this is invoked directly
// from the composer's debounced autosave, not a <form action>, and the
// client wraps the call in its own try/catch to manage save-status UI.
// requireDbUser()'s redirect() throw would get silently swallowed by
// that catch (this exact bug hit Journal's autosave - see commit
// a61f180) - getDbUser() returns null instead, and the client checks it.
export async function saveDraftNoteAction(
  input: z.input<typeof draftNoteSchema>,
): Promise<{ id: string } | { error: "unauthenticated" | "invalid" }> {
  const dbUser = await getDbUser();
  if (!dbUser) return { error: "unauthenticated" };
  const parsed = draftNoteSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { id, ...data } = parsed.data;

  const payload = {
    type: "NOTE" as const,
    title: data.title || "Untitled note",
    contentJson: data.contentJson as object,
    contentText: data.contentText,
    category: data.category,
    tags: data.tags,
  };

  let item;
  if (id) {
    const result = await prisma.vaultItem.updateMany({ where: { id, userId: dbUser.id, type: "NOTE" }, data: payload });
    item = result.count > 0 ? { id } : null;
  }
  if (!item) {
    item = await prisma.vaultItem.create({ data: { userId: dbUser.id, ...payload }, select: { id: true } });
  }

  revalidateVault();
  return item;
}

// Plain button click (New Note), not a debounce - safe to use
// requireDbUser() here since nothing wraps the call in a try/catch that
// would swallow its redirect.
export async function createEmptyNoteAction() {
  const dbUser = await requireDbUser();
  const item = await prisma.vaultItem.create({
    data: { userId: dbUser.id, type: "NOTE", title: "Untitled note", contentText: "" },
    select: { id: true },
  });
  revalidateVault();
  return item;
}

// ---------- Links ----------

const linkSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  url: z.string().trim().url("Invalid URL.").max(2000),
  contentText: z.string().trim().max(2000).default(""),
  category: optionalText(40),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export async function createLinkAction(input: z.input<typeof linkSchema>) {
  const dbUser = await requireDbUser();
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const item = await prisma.vaultItem.create({ data: { userId: dbUser.id, type: "LINK", ...parsed.data } });
  revalidateVault();
  return { item };
}

const linkUpdateSchema = linkSchema.partial();

export async function updateLinkAction(itemId: string, input: z.input<typeof linkUpdateSchema>) {
  const dbUser = await requireDbUser();
  const parsed = linkUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.vaultItem.updateMany({ where: { id: itemId, userId: dbUser.id, type: "LINK" }, data: parsed.data });
  revalidateVault();
  return { success: true };
}

// ---------- Shared ----------

export async function toggleFavoriteAction(itemId: string, favorited: boolean) {
  const dbUser = await requireDbUser();
  await prisma.vaultItem.updateMany({ where: { id: itemId, userId: dbUser.id }, data: { favorited } });
  revalidateVault();
}

export async function deleteVaultItemAction(itemId: string) {
  const dbUser = await requireDbUser();
  await prisma.vaultItem.deleteMany({ where: { id: itemId, userId: dbUser.id } });
  revalidateVault();
}

// ---------- Reports ----------

export async function generateVaultReportAction(period: ReportPeriod, periodStart: string) {
  const dbUser = await requireDbUser();
  const summary = await generateVaultReport(dbUser.id, period, new Date(periodStart));
  revalidateVault("/vault/reports");
  return summary;
}
