import { Sparkles } from "lucide-react";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";

export function DesktopSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <Sparkles className="size-4" />
        AURA OS
      </div>
      <SidebarNav />
    </aside>
  );
}
