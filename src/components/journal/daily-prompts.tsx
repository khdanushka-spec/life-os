"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateDailyPromptsAction } from "@/server/actions/journal";
import { Button } from "@/components/ui/button";

export function DailyPrompts({
  fallback,
  onSelect,
}: {
  fallback: string[];
  onSelect: (prompt: string) => void;
}) {
  const [prompts, setPrompts] = useState(fallback);
  const [loading, setLoading] = useState(false);

  async function regenerate() {
    setLoading(true);
    const generated = await generateDailyPromptsAction();
    if (generated) setPrompts(generated);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Today&apos;s questions</p>
        <Button
          variant="ghost"
          size="xs"
          onClick={regenerate}
          disabled={loading}
          className="gap-1 text-muted-foreground"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
          Regenerate
        </Button>
      </div>
      <AnimatePresence mode="popLayout">
        <div className="flex flex-wrap gap-1.5">
          {prompts.map((p) => (
            <motion.button
              key={p}
              type="button"
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => onSelect(p)}
              className="rounded-full border border-dashed px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {p}
            </motion.button>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
