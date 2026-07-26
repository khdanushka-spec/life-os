"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPackingItemAction } from "@/server/actions/travel";
import { PACKING_CATEGORY_PRESETS } from "@/lib/travel";

export function AddPackingItemForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createPackingItemAction({ tripId, name: name.trim(), category: category || null });
      setName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a packing item" maxLength={120} className="flex-1" />
      <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : (v as string))}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No category</SelectItem>
          {PACKING_CATEGORY_PRESETS.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="icon" aria-label="Add packing item" disabled={isPending}>
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
