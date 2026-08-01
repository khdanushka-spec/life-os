"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTransactionAction } from "@/server/actions/finance";
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
import type { TransactionType } from "@/generated/prisma/client";

export function TransactionForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [category, setCategory] = useState(TRANSACTION_CATEGORIES[0]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isTransfer = type === "TRANSFER";
  const accountLabel = (id: string) => accounts.find((a) => a.id === id)?.name ?? "Select account";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" disabled={accounts.length === 0} />}>
        <Plus className="size-4" /> Add transaction
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            formData.set("type", type);
            formData.set("accountId", accountId);
            formData.set("category", isTransfer ? "Transfer" : category);
            if (isTransfer) formData.set("toAccountId", toAccountId);
            startTransition(async () => {
              await createTransactionAction(formData);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="flex gap-2">
            {(["EXPENSE", "INCOME", "TRANSFER"] as TransactionType[]).map((t) => (
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
          <div className="flex flex-col gap-1.5">
            <Label>{isTransfer ? "From account" : "Account"}</Label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v as string)}>
              <SelectTrigger>
                <SelectValue>{accountLabel(accountId)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isTransfer && (
            <div className="flex flex-col gap-1.5">
              <Label>To account</Label>
              <Select value={toAccountId} onValueChange={(v) => setToAccountId(v as string)}>
                <SelectTrigger>
                  <SelectValue>{accountLabel(toAccountId)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Both accounts must use the same currency for now.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="txn-amount">Amount</Label>
              <Input id="txn-amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="txn-date">Date</Label>
              <Input id="txn-date" name="date" type="date" defaultValue={localDateInputValue()} required />
            </div>
          </div>
          {!isTransfer && (
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
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="txn-desc">Description (optional)</Label>
            <Input id="txn-desc" name="description" placeholder="e.g. Woolworths" maxLength={280} />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || !accountId || (isTransfer && (!toAccountId || toAccountId === accountId))}
            >
              {isPending ? "Adding..." : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
