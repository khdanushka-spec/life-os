"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function TransactionsAccountFilter({
  accounts,
  activeAccountId,
}: {
  accounts: { id: string; name: string }[];
  activeAccountId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeName = accounts.find((a) => a.id === activeAccountId)?.name;

  return (
    <Select
      value={activeAccountId ?? "all"}
      onValueChange={(v) => {
        const id = v as string;
        // Preserves whatever date/range filter is already active - picking
        // an account shouldn't silently drop it.
        const params = new URLSearchParams(searchParams.toString());
        if (id === "all") params.delete("accountId");
        else params.set("accountId", id);
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
      }}
    >
      <SelectTrigger className="h-7 w-44 text-xs">
        <SelectValue>{activeAccountId ? (activeName ?? "All accounts") : "All accounts"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
