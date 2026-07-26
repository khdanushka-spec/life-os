import type { CourseStatus, BookStatus } from "@/generated/prisma/client";

export type StudyLogDetail = {
  date: string;
  minutesStudied: number | null;
  focusScore: number | null;
  note: string | null;
};

export type CourseDetail = {
  id: string;
  title: string;
  provider: string | null;
  status: CourseStatus;
  progressPercent: number;
  startedAt: Date | null;
  completedAt: Date | null;
  url: string | null;
  notes: string | null;
};

export type BookDetail = {
  id: string;
  title: string;
  author: string | null;
  status: BookStatus;
  currentPage: number | null;
  totalPages: number | null;
  rating: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  notes: string | null;
};

export type CertificateDetail = {
  id: string;
  title: string;
  issuer: string | null;
  issueDate: Date;
  expiryDate: Date | null;
  credentialUrl: string | null;
  notes: string | null;
};
