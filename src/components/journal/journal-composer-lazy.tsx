"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// TipTap + ProseMirror (~440KB across two chunks) only need to load once the
// user is actually about to write - not as part of the initial page bundle
// for every Journal visit, most of which are read-only.
function ComposerSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

export const JournalComposer = dynamic(
  () => import("@/components/journal/journal-composer").then((m) => m.JournalComposer),
  { ssr: false, loading: () => <ComposerSkeleton /> },
);
