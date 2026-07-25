"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createAssetLiabilityAction } from "@/server/actions/finance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssetLiabilityKind } from "@/generated/prisma/client";

export function AssetLiabilityForm() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AssetLiabilityKind>("ASSET");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="size-4" /> Add asset/liability
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add asset or liability</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            formData.set("kind", kind);
            startTransition(async () => {
              await createAssetLiabilityAction(formData);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="flex gap-2">
            {(["ASSET", "LIABILITY"] as AssetLiabilityKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                  kind === k ? "border-primary bg-primary/10" : "border-transparent bg-muted text-muted-foreground"
                }`}
              >
                {k.toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="al-name">Name</Label>
            <Input id="al-name" name="name" placeholder="e.g. Car, Personal loan" required maxLength={80} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="al-category">Category</Label>
            <Input id="al-category" name="category" placeholder="e.g. Vehicle" required maxLength={60} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="al-value">Value</Label>
            <Input id="al-value" name="value" type="number" step="0.01" min="0" placeholder="0.00" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
