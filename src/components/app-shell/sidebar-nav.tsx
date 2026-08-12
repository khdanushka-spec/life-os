"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { navItems, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { transitionFast } from "@/lib/motion";

// Purely presentational grouping - navItems from lib/nav.ts stays the
// single source of truth for what pages exist and in what order; this
// just buckets them into labeled sections for the sidebar.
const OVERVIEW_HREFS = new Set(["/home", "/tasks", "/ai"]);

function groupNavItems(items: NavItem[]) {
  const overview = items.filter((i) => OVERVIEW_HREFS.has(i.href));
  const lifeAreas = items.filter((i) => !OVERVIEW_HREFS.has(i.href));
  return [
    { label: "Overview", items: overview },
    { label: "Life Areas", items: lifeAreas },
  ];
}

export function SidebarNav({
  onNavigate,
  collapsed = false,
  isAdmin = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const groups = groupNavItems(navItems);
  const adminActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {!collapsed && (
            <p className="px-2.5 pb-1 text-[11px] font-medium tracking-wide text-sidebar-foreground/40 uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = pathname === item.href;

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/40",
                    collapsed && "justify-center px-0",
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        Soon
                      </Badge>
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                  collapsed && "justify-center px-0",
                  active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    transition={transitionFast}
                    className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-[var(--shadow-glow-primary)]"
                  />
                )}
                {!active && (
                  <span className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:bg-sidebar-accent/60" />
                )}
                <item.icon className="relative size-4 shrink-0" />
                {!collapsed && <span className="relative flex-1 truncate">{item.title}</span>}
              </Link>
            );
          })}
        </div>
      ))}

      {isAdmin && (
        <div className="mt-auto flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
          <Link
            href="/admin"
            onClick={onNavigate}
            title={collapsed ? "Admin" : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150",
              collapsed && "justify-center px-0",
              adminActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground",
            )}
          >
            {adminActive && (
              <motion.span
                layoutId="sidebar-active-pill"
                transition={transitionFast}
                className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-[var(--shadow-glow-primary)]"
              />
            )}
            {!adminActive && (
              <span className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:bg-sidebar-accent/60" />
            )}
            <ShieldCheck className="relative size-4 shrink-0" />
            {!collapsed && <span className="relative flex-1 truncate">Admin</span>}
          </Link>
        </div>
      )}
    </nav>
  );
}
