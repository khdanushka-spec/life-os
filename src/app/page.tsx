import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/home");
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="flex h-14 items-center justify-between px-4 md:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4" />
          AURA OS
        </span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          Your life. Beautifully organized.
          <br />
          Intelligently guided.
        </h1>
        <p className="max-w-md text-lg text-muted-foreground text-balance">
          A calm, AI-first home for your goals, routines, and knowledge — one
          place instead of a dozen apps.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Get started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
