"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertCircle, ArrowUpDown } from "lucide-react";
import {
  parseStatementAction,
  importStatementTransactionsAction,
  type StatementImportCandidate,
} from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

type AccountOption = { id: string; name: string; currency: string };

type Row = StatementImportCandidate & { linkAccountId: string | null };

export function ImportStatementClient({ accounts }: { accounts: AccountOption[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [linkableAccounts, setLinkableAccounts] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "AUD";

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after fixing it
    if (!file || !accountId) return;

    setError(null);
    setImportedCount(null);
    setRows(null);

    const formData = new FormData();
    formData.set("accountId", accountId);
    formData.set("file", file);
    if (fromDate) formData.set("from", fromDate);
    if (toDate) formData.set("to", toDate);

    startTransition(async () => {
      const result = await parseStatementAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLinkableAccounts(result.linkableAccounts);
      const nextRows = result.candidates.map((c) => ({ ...c, linkAccountId: c.matchedAccountId }));
      setRows(nextRows);
      // Duplicates and rows whose income/expense direction is only a guess
      // (PDF parsing without a reliable balance-delta signal) start
      // unchecked - both need a look before they're worth trusting.
      setSelected(new Set(nextRows.map((_, i) => i).filter((i) => !nextRows[i].isDuplicate && !nextRows[i].uncertainSign)));
    });
  }

  function toggleRow(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function setRowLink(i: number, linkAccountId: string | null) {
    setRows((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, linkAccountId } : r)) : prev));
  }

  function flipSign(i: number) {
    setRows((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, amount: -r.amount } : r)) : prev));
  }

  function handleConfirm() {
    if (!rows) return;
    const toImport = rows.filter((_, i) => selected.has(i));
    startTransition(async () => {
      const result = await importStatementTransactionsAction(
        accountId,
        toImport.map((r) => ({ date: r.date, description: r.description, amount: r.amount, linkAccountId: r.linkAccountId })),
      );
      if (result.ok) {
        setImportedCount(result.count);
        setRows(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Account this statement is for</Label>
          <Select
            value={accountId}
            onValueChange={(v) => {
              setAccountId(v as string);
              setRows(null);
              setError(null);
              setImportedCount(null);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue>{accounts.find((a) => a.id === accountId)?.name ?? "Select account"}</SelectValue>
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
        <div className="flex flex-col gap-1.5">
          <Label>Only extract this date range (optional)</Label>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-40" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-40" />
          </div>
          <p className="text-[11px] text-muted-foreground">Leave blank to extract everything. Set this before choosing the file.</p>
        </div>
        <Label
          className={cn(
            "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted/50",
            (!accountId || isPending) && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="size-4" />
          {isPending ? "Reading…" : "Choose CSV or PDF file"}
          <input
            type="file"
            accept=".csv,text/csv,.pdf,application/pdf"
            className="hidden"
            onChange={handleFile}
            disabled={!accountId || isPending}
          />
        </Label>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      {importedCount != null && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" /> Added {importedCount} transaction{importedCount === 1 ? "" : "s"}.
        </p>
      )}

      {rows && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rows.length} rows found · {selected.size} selected · {rows.filter((r) => r.isDuplicate).length} look already
              recorded
              {rows.some((r) => r.uncertainSign) && ` · ${rows.filter((r) => r.uncertainSign).length} need a direction check`}
            </p>
            <Button size="sm" disabled={selected.size === 0 || isPending} onClick={handleConfirm}>
              {isPending ? "Adding…" : `Add ${selected.size} transaction${selected.size === 1 ? "" : "s"}`}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            {rows.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border p-2.5",
                  r.isDuplicate && !selected.has(i) && "opacity-50",
                )}
              >
                <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleRow(i)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    {r.isDuplicate && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px]">
                        Already recorded
                      </Badge>
                    )}
                    {r.uncertainSign && (
                      <Badge variant="destructive" className="ml-1.5 text-[10px]">
                        Check direction
                      </Badge>
                    )}
                  </p>
                </div>
                {r.uncertainSign && (
                  <Button variant="ghost" size="icon-sm" aria-label="Flip income/expense" onClick={() => flipSign(i)}>
                    <ArrowUpDown className="size-3.5" />
                  </Button>
                )}
                {linkableAccounts.length > 0 && (
                  <Select value={r.linkAccountId ?? "none"} onValueChange={(v) => setRowLink(i, v === "none" ? null : (v as string))}>
                    <SelectTrigger className="h-7 w-44 text-xs">
                      <SelectValue>
                        {r.linkAccountId ? (linkableAccounts.find((a) => a.id === r.linkAccountId)?.name ?? "Not a transfer") : "Not a transfer"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not a transfer</SelectItem>
                      {linkableAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          → {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p
                  className={cn(
                    "w-24 shrink-0 text-right text-sm font-semibold tabular-nums",
                    r.amount > 0 && "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {r.amount > 0 ? "+" : ""}
                  {formatCurrency(r.amount, currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
