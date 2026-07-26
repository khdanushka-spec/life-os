import type { VaultItemType } from "@/generated/prisma/client";

export type VaultItemSummary = {
  id: string;
  type: VaultItemType;
  title: string;
  contentText: string;
  url: string | null;
  category: string | null;
  tags: string[];
  favorited: boolean;
  updatedAt: Date;
};

export type LinkDetail = {
  id: string;
  title: string;
  url: string;
  contentText: string;
  category: string | null;
  tags: string[];
};

export type NoteInitial = {
  id: string;
  title: string;
  contentJson: unknown;
  category: string | null;
  tags: string[];
};
