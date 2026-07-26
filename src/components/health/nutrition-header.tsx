"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NutritionFormDialog } from "@/components/health/nutrition-form-dialog";

export function NutritionHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nutrition</h1>
        <p className="text-sm text-muted-foreground">A lightweight log of what you ate.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Log Meal
      </Button>
      <NutritionFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
