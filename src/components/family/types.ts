import type { FamilyEventType, GiftIdeaStatus } from "@/generated/prisma/client";

export type MemberOption = { id: string; name: string };

export type MemberDetail = {
  id: string;
  name: string;
  relationship: string | null;
  birthday: Date | null;
  photoUrl: string | null;
  notes: string | null;
  archived: boolean;
};

export type EventDetail = {
  id: string;
  title: string;
  type: FamilyEventType;
  date: Date;
  memberId: string | null;
  location: string | null;
  notes: string | null;
};

export type GiftIdeaDetail = {
  id: string;
  memberId: string;
  title: string;
  occasion: string | null;
  price: number | null;
  url: string | null;
  status: GiftIdeaStatus;
  notes: string | null;
};

export type DocumentDetail = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  memberId: string | null;
  tags: string[];
};
