import type { LucideIcon } from "lucide-react";
import {
  Home,
  ListChecks,
  Flame,
  NotebookPen,
  Briefcase,
  HeartPulse,
  Wallet,
  GraduationCap,
  Users,
  Plane,
  BookOpen,
  Sparkles,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const navItems: NavItem[] = [
  { title: "Home", href: "/home", icon: Home },
  { title: "Tasks", href: "/tasks", icon: ListChecks },
  { title: "Habits", href: "/habits", icon: Flame },
  { title: "Journal", href: "/journal", icon: NotebookPen },
  { title: "Finance", href: "/finance", icon: Wallet },
  { title: "Aura Brain", href: "/ai", icon: Sparkles },
  { title: "Work", href: "/work", icon: Briefcase },
  { title: "Health", href: "/health", icon: HeartPulse },
  { title: "Learning", href: "/learning", icon: GraduationCap, disabled: true },
  { title: "Family", href: "/family", icon: Users, disabled: true },
  { title: "Travel", href: "/travel", icon: Plane, disabled: true },
  { title: "Knowledge Vault", href: "/vault", icon: BookOpen, disabled: true },
];
