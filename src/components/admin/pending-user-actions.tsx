"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveUserAction, rejectUserAction } from "@/server/actions/admin-users";

export function PendingUserActions({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await approveUserAction(userId);
            router.refresh();
          })
        }
      >
        <Check className="size-3.5" /> Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await rejectUserAction(userId);
            router.refresh();
          })
        }
      >
        <X className="size-3.5" /> Reject
      </Button>
    </div>
  );
}
