"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { resetToPendingAction, setUserRoleAction } from "@/server/actions/admin-users";
import type { UserRole, UserStatus } from "@/generated/prisma/client";

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  USER: "User",
};

// canChangeRole is false for the viewer's own row (server-enforced too in
// setUserRoleAction, but hiding the control avoids a confusing no-op click)
// and for anyone viewing without SUPER_ADMIN - only Super Admins grant
// admin access.
export function MemberActions({
  userId,
  role,
  status,
  canChangeRole,
}: {
  userId: string;
  role: UserRole;
  status: UserStatus;
  canChangeRole: boolean;
}) {
  const [isPending, startTransition] = useTransition();
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
      {canChangeRole ? (
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
