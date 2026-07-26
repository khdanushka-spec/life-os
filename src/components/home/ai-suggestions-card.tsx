"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInUp, staggerContainer } from "@/lib/motion";

export function AiSuggestionsCard({ suggestions }: { suggestions: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex size-5 items-center justify-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-primary/25 blur-sm" />
            <Sparkles className="relative size-4 text-primary" />
          </span>
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <motion.p
              key={s}
              variants={fadeInUp}
              className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground"
            >
              {s}
            </motion.p>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
