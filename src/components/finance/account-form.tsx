"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createAccountAction } from "@/server/actions/finance";
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
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance";
import type { AccountType } from "@/generated/prisma/client";

const TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

export function AccountForm() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AccountType>("CHECKING");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isCredit = type === "CREDIT_CARD" || type === "LOAN";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" /> Add account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            formData.set("type", type);
            startTransition(async () => {
              await createAccountAction(formData);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-name">Name</Label>
            <Input id="account-name" name="name" placeholder="e.g. Everyday Checking" required maxLength={80} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-balance">{isCredit ? "Current balance owed" : "Current balance"}</Label>
            <Input
              id="account-balance"
              name="balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>
          {type === "CREDIT_CARD" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-limit">Credit limit</Label>
              <Input id="account-limit" name="creditLimit" type="number" step="0.01" placeholder="0.00" />
            </div>
          )}
          {isCredit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-rate">Interest rate (% p.a.)</Label>
              <Input id="account-rate" name="interestRate" type="number" step="0.01" placeholder="0.00" />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
