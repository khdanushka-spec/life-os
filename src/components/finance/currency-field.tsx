"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A curated shortlist, not every ISO 4217 code - a full searchable
// combobox would be overkill for a personal app. Any 3-letter code still
// works by typing it directly; these are just one-tap shortcuts for the
// currencies Dhanu actually holds accounts in.
const COMMON_CURRENCIES = ["LKR", "USD", "GBP", "EUR", "INR", "NZD", "SGD"];

export function CurrencyField({ value, onChange }: { value: string; onChange: (currency: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="currency-code">Currency</Label>
      <Input
        id="currency-code"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, 3))}
        maxLength={3}
        placeholder="LKR"
        className="w-20 uppercase"
        required
      />
      <div className="flex flex-wrap gap-1.5">
        {COMMON_CURRENCIES.map((code) => (
          <Button
            key={code}
            type="button"
            variant="outline"
            size="xs"
            className={cn(value === code && "border-primary text-primary")}
            onClick={() => onChange(code)}
          >
            {code}
          </Button>
        ))}
      </div>
    </div>
  );
}
