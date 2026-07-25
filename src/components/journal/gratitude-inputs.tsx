"use client";

import { Sparkle } from "lucide-react";
import { Input } from "@/components/ui/input";

const PROMPTS = ["I'm grateful for...", "Also grateful for...", "And one more thing..."];

export function GratitudeInputs({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const items = [value[0] ?? "", value[1] ?? "", value[2] ?? ""];

  function setAt(index: number, text: string) {
    const next = [...items];
    next[index] = text;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkle className="size-3.5" /> Three things I&apos;m grateful for
      </p>
      {items.map((text, i) => (
        <Input
          key={i}
          value={text}
          placeholder={PROMPTS[i]}
          maxLength={280}
          onChange={(e) => setAt(i, e.target.value)}
        />
      ))}
    </div>
  );
}
