"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Ban, CircleCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  resetToPendingAction,
  setUserRoleAction,
  disableUserAction,
  enableUserAction,
  deleteUserAction,
} from "@/server/actions/admin-users";
import type { UserRole, UserStatus } from "@/generated/prisma/client";

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  USER: "User",
};

// canManage is false for the viewer's own row (server-enforced too in every
// action below, but hiding the controls avoids a confusing no-op click) and
// for anyone viewing without SUPER_ADMIN - only Super Admins can change
// role, disable/enable, or delete another member.
export function MemberActions({
  userId,
  role,
  status,
  canManage,
}: {
  userId: string;
  role: UserRole;
  status: UserStatus;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();

  return (
    <div className="flex shrink-0 items-center gap-2">
      {status === "REJECTED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await resetToPendingAction(userId);
              router.refresh();
            })
          }
        >
          <RotateCcw className="size-3.5" /> Reconsider
        </Button>
      )}
      {canManage && status === "APPROVED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await disableUserAction(userId);
              router.refresh();
            })
          }
        >
          <Ban className="size-3.5" /> Disable
        </Button>
      )}
      {canManage && status === "DISABLED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await enableUserAction(userId);
              router.refresh();
            })
          }
        >
          <CircleCheck className="size-3.5" /> Enable
        </Button>
      )}
      {canManage && (
        <Button
          size="sm"
          variant={confirmingDelete ? "destructive" : "outline"}
          disabled={isPending}
          onBlur={() => setConfirmingDelete(false)}
          onClick={() => {
            if (!confirmingDelete) {
              setConfirmingDelete(true);
              return;
            }
            startTransition(async () => {
              await deleteUserAction(userId);
              router.refresh();
            });
          }}
        >
          <Trash2 className="size-3.5" /> {confirmingDelete ? "Confirm delete?" : "Delete"}
        </Button>
      )}
      {canManage ? (
        <Select
          value={role}
          onValueChange={(v) =>
            startTransition(async () => {
              await setUserRoleAction(userId, v as UserRole);
              router.refresh();
            })
          }
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue>{ROLE_LABELS[role]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(["USER", "ADMIN", "SUPER_ADMIN"] as UserRole[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
      )}
    </div>
  );
}
