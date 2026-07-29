"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Same reasoning as journal-composer-lazy.tsx - defers the ~440KB TipTap
// bundle off the initial page load for task detail views.
export const TaskDescriptionEditor = dynamic(
  () => import("@/components/tasks/task-description-editor").then((m) => m.TaskDescriptionEditor),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> },
);
