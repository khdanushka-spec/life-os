"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Menu, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app-shell/user-menu";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { CommandPalette } from "@/components/app-shell/command-palette";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Topbar({ user, nickname }: { user: User | null; nickname: string | null }) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden" />}
        >
          <Menu className="size-4" />
          <span className="sr-only">Open navigation</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              AURA OS
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="hidden max-w-72 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:border-foreground/15 hover:text-foreground sm:flex"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search or jump to...</span>
        <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open command palette"
        onClick={() => setPaletteOpen(true)}
        className="sm:hidden"
      >
        <Search className="size-4" />
      </Button>

      <div className="flex-1" />
      <ThemeToggle />
      <UserMenu initialUser={user} nickname={nickname} />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
