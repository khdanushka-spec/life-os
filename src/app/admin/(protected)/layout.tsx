import { requireAdminUser } from "@/server/admin-user";
import { adminSignOutAction } from "@/server/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, LogOut } from "lucide-react";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminUser("ADMIN");

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="flex h-14 items-center gap-3 border-b px-4">
        <span className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4" />
          AURA OS Admin
        </span>
        <Badge variant="secondary">{admin.role}</Badge>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">{admin.username ?? admin.email}</span>
        <form action={adminSignOutAction}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
