import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/home");
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="w-full max-w-sm">{children}</div>
      <Link
        href="/admin/login"
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Admin sign in
      </Link>
    </div>
  );
}
