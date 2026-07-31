"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createInvestmentAction } from "@/server/actions/finance";
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
import { CurrencyField } from "@/components/finance/currency-field";
import { INVESTMENT_TYPE_LABELS } from "@/lib/finance";
import type { InvestmentType } from "@/generated/prisma/client";

const TYPES = Object.keys(INVESTMENT_TYPE_LABELS) as InvestmentType[];

export function InvestmentForm({ currency = "AUD", currencyPicker = false }: { currency?: string; currencyPicker?: boolean }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InvestmentType>("SHARES");
  const [pickedCurrency, setPickedCurrency] = useState("LKR");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hasUnits = type === "SHARES" || type === "ETF" || type === "CRYPTO";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" /> Add investment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add investment</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            formData.set("type", type);
            formData.set("currency", currencyPicker ? pickedCurrency : currency);
            startTransition(async () => {
              await createInvestmentAction(formData);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-name">Name</Label>
            <Input id="inv-name" name="name" placeholder="e.g. VAS, BTC, 12 Smith St" required maxLength={80} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InvestmentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {INVESTMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {currencyPicker && <CurrencyField value={pickedCurrency} onChange={setPickedCurrency} />}
          {hasUnits && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-units">Units</Label>
              <Input id="inv-units" name="units" type="number" step="0.000001" placeholder="0" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-cost">Cost basis</Label>
              <Input id="inv-cost" name="costBasis" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-value">Current value</Label>
              <Input id="inv-value" name="currentValue" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>
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
