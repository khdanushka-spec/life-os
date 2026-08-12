import { ShieldCheck } from "lucide-react";
import { requireAdminUser } from "@/server/admin-user";
import { prisma } from "@/lib/prisma";
import { PendingUserActions } from "@/components/admin/pending-user-actions";
import { MemberActions } from "@/components/admin/member-actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE_VARIANT = {
  PENDING: "secondary",
  APPROVED: "outline",
  REJECTED: "destructive",
} as const;

export default async function AdminDashboardPage() {
  const admin = await requireAdminUser("ADMIN");

  const users = await prisma.user.findMany({
    // Local admin accounts (username set, no email) aren't part of the
    // sign-up-and-approve flow this page manages - they're created
    // directly, same as "dhanu" was.
    where: { email: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  const pending = users.filter((u) => u.status === "PENDING");
  const others = users.filter((u) => u.status !== "PENDING");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Welcome, {admin.username ?? admin.email}
          </CardTitle>
          <CardDescription>Signed in as {admin.role.replace("_", " ").toLowerCase()}.</CardDescription>
        </CardHeader>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Pending requests {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No pending requests.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.name ?? u.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <PendingUserActions userId={u.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">All members</h2>
        <div className="flex flex-col gap-2">
          {others.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {u.name ?? u.email}
                  {u.id === admin.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant={STATUS_BADGE_VARIANT[u.status]}>{u.status}</Badge>
                <MemberActions
                  userId={u.id}
                  role={u.role}
                  status={u.status}
                  canChangeRole={admin.role === "SUPER_ADMIN" && u.id !== admin.id}
                />
              </div>
            </div>
          ))}
          {others.length === 0 && (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No other members yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
