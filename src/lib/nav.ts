import type { LucideIcon } from "lucide-react";
import {
  Home,
  ListChecks,
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
  { title: "AI Brain", href: "/ai", icon: Sparkles, disabled: true },
  { title: "Work", href: "/work", icon: Briefcase, disabled: true },
  { title: "Health", href: "/health", icon: HeartPulse, disabled: true },
  { title: "Finance", href: "/finance", icon: Wallet, disabled: true },
  { title: "Learning", href: "/learning", icon: GraduationCap, disabled: true },
  { title: "Family", href: "/family", icon: Users, disabled: true },
  { title: "Travel", href: "/travel", icon: Plane, disabled: true },
  { title: "Knowledge Vault", href: "/vault", icon: BookOpen, disabled: true },
];
