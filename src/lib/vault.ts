import { z } from "zod";
import type { VaultItemType } from "@/generated/prisma/client";

export const VAULT_ITEM_TYPE_META: Record<VaultItemType, { label: string; icon: string }> = {
  NOTE: { label: "Note", icon: "📝" },
  LINK: { label: "Link", icon: "🔗" },
};

export const VAULT_CATEGORY_PRESETS = ["Ideas", "Reference", "Reading List", "Research", "Recipes", "Quotes", "Other"];

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// The AI only ever fills in these narrative fields - every number in a
// report is computed separately and merged in, same principle as every
// other module's reports.
export const vaultReportNarrativeSchema = z.object({
  overview: z.string(),
  wins: z.array(z.string()).max(5),
  challenges: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
});
export type VaultReportNarrative = z.infer<typeof vaultReportNarrativeSchema>;

export type VaultReportSummary = VaultReportNarrative & {
  itemsAdded: number;
  notesAdded: number;
  linksAdded: number;
};
