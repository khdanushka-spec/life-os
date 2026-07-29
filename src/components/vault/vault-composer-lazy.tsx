"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Same reasoning as journal-composer-lazy.tsx - defers the ~440KB TipTap
// bundle off the initial page load for vault item detail views.
function ComposerSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export const VaultComposer = dynamic(
  () => import("@/components/vault/vault-composer").then((m) => m.VaultComposer),
  { ssr: false, loading: () => <ComposerSkeleton /> },
);
