"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateTransactionAction } from "@/server/actions/finance";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TRANSACTION_CATEGORIES } from "@/lib/finance";
import { localDateInputValue } from "@/lib/date";
import type { TransactionView } from "./transactions-list";

export function TransactionEditDialog({ txn }: { txn: TransactionView }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(txn.category);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit transaction" />}>
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            formData.set("category", category);
            startTransition(async () => {
              await updateTransactionAction(txn.id, formData);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-amount-${txn.id}`}>Amount</Label>
              <Input
                id={`edit-amount-${txn.id}`}
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={Math.abs(txn.amount)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-date-${txn.id}`}>Date</Label>
              <Input
                id={`edit-date-${txn.id}`}
                name="date"
                type="date"
                defaultValue={localDateInputValue(new Date(txn.date))}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as string)}>
              <SelectTrigger>
                <SelectValue>{category}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-desc-${txn.id}`}>Description (optional)</Label>
            <Input id={`edit-desc-${txn.id}`} name="description" defaultValue={txn.description ?? ""} maxLength={280} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
