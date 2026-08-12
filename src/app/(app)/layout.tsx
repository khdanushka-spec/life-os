import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireDbUser } from "@/server/db-user";
import { DesktopSidebar } from "@/components/app-shell/desktop-sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  let user: User | null = null;
  let nickname: string | null = null;
  let isAdmin = false;

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) redirect("/login");
    user = currentUser;
    const dbUser = await requireDbUser();
    if (dbUser.status !== "APPROVED") redirect("/pending");
    nickname = dbUser.username;
    isAdmin = dbUser.role !== "USER";
  }

  return (
    <div className="flex min-h-svh flex-1">
      <DesktopSidebar isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col">
        <Topbar user={user} nickname={nickname} isAdmin={isAdmin} />
        <main className="flex-1 overflow-y-auto">
          {!configured && (
            <div className="p-4 pb-0">
              <Alert>
                <TriangleAlert />
                <AlertTitle>Preview mode</AlertTitle>
                <AlertDescription>
                  Supabase isn&apos;t configured yet, so authentication is
                  disabled and this dashboard is showing mock data. Set
                  NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
                  enable real accounts.
                </AlertDescription>
              </Alert>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
