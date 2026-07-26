"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { fadeInUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

// Shared "nothing here yet" treatment - icon + message + a real next step,
// never a bare "Nothing here" sentence. Every module's empty list/board
// state should route through this rather than hand-rolling its own.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  helpText,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  helpText?: string;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <div className="relative flex size-14 items-center justify-center rounded-2xl bg-accent">
        <div aria-hidden className="absolute inset-0 rounded-2xl bg-primary/10 blur-md" />
        <Icon className="relative size-6 text-primary" />
      </div>
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="text-subheading">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <Link href={action.href} className={buttonVariants({ variant: "default" })}>
                {action.label}
              </Link>
            ) : (
              <Button type="button" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Link href={secondaryAction.href} className={buttonVariants({ variant: "outline" })}>
                {secondaryAction.label}
              </Link>
            ) : (
              <Button type="button" variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
      {helpText && <p className="text-caption">{helpText}</p>}
    </motion.div>
  );
}
