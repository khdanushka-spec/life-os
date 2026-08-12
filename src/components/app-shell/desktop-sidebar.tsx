"use client";

import { useSyncExternalStore } from "react";
import { Sparkles, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { transitionBase } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "aura-sidebar-collapsed";
const listeners = new Set<() => void>();

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setCollapsedPreference(value: boolean) {
  localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  listeners.forEach((listener) => listener());
}

export function DesktopSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  // useSyncExternalStore, not useState+useEffect - localStorage is an
  // external store, and this is the React-sanctioned way to read it
  // without a hydration-mismatching client-only render pass.
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={transitionBase}
      className="hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
    >
      <div className={cn("flex h-16 items-center gap-2 border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
        <div className="relative flex size-6 shrink-0 items-center justify-center">
          <div aria-hidden className="absolute inset-0 rounded-full bg-primary/20 blur-sm" />
          <Sparkles className="relative size-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">AURA OS</span>
            <span className="text-[10px] text-sidebar-foreground/50">Your Life, Organized.</span>
          </div>
        )}
      </div>

      <SidebarNav collapsed={collapsed} isAdmin={isAdmin} />

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => setCollapsedPreference(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-4 shrink-0" /> : <PanelLeftClose className="size-4 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
