"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createRecurringAction } from "@/server/actions/finance";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TRANSACTION_CATEGORIES } from "@/lib/finance";
import { localDateInputValue } from "@/lib/date";
import type { RecurringInterval, TransactionType } from "@/generated/prisma/client";

const INTERVALS: { value: RecurringInterval; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "FORTNIGHTLY", label: "Fortnightly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

export function RecurringForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [interval, setInterval] = useState<RecurringInterval>("MONTHLY");
  const [category, setCategory] = useState(TRANSACTION_CATEGORIES[0]);
  const [accountId, setAccountId] = useState<string>("none");
  const [autoPay, setAutoPay] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" /> Add recurring
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add bill or subscription</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            formData.set("type", type);
            formData.set("interval", interval);
            formData.set("category", category);
            formData.set("accountId", accountId);
            formData.set("autoPay", autoPay ? "on" : "off");
            startTransition(async () => {
              await createRecurringAction(formData);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rec-name">Name</Label>
            <Input id="rec-name" name="name" placeholder="e.g. Netflix" required maxLength={80} />
          </div>
          <div className="flex gap-2">
            {(["EXPENSE", "INCOME"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                  type === t ? "border-primary bg-primary/10" : "border-transparent bg-muted text-muted-foreground"
                }`}
              >
                {t.toLowerCase()}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input id="rec-amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rec-date">Next due</Label>
              <Input id="rec-date" name="nextDueDate" type="date" required defaultValue={localDateInputValue()} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Repeats</Label>
            <Select value={interval} onValueChange={(v) => setInterval(v as RecurringInterval)}>
              <SelectTrigger>
                <SelectValue>{INTERVALS.find((i) => i.value === interval)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label>Nominated account</Label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v as string)}>
              <SelectTrigger>
                <SelectValue>{accountId === "none" ? "No account (track only)" : accounts.find((a) => a.id === accountId)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No account (track only)</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className={`flex items-center gap-2 text-sm ${accountId === "none" ? "text-muted-foreground" : ""}`}>
            <Checkbox
              checked={autoPay}
              onCheckedChange={setAutoPay}
              disabled={accountId === "none"}
            />
            Auto-pay {accountId === "none" ? "(pick an account first)" : `— deduct/credit this account on the due date`}
          </label>
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
