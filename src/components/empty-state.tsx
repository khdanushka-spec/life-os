"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
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
//
// icon takes a rendered element (e.g. <ListChecks />), not a component
// reference - this is used from async Server Component pages, and a bare
// component type isn't serializable across the server/client boundary
// ("Functions cannot be passed directly to Client Components"). A JSX
// element is a plain serializable object, so this is the fix, not a
// workaround.
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  helpText,
  className,
}: {
  icon: ReactNode;
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
        <span className="relative [&>svg]:size-6 [&>svg]:text-primary">{icon}</span>
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
