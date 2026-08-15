import "server-only";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

export type StatementCandidate = {
  date: Date;
  description: string;
  amount: number; // signed: positive = income/credit, negative = expense/debit
};

// Bank CSV exports vary a lot by institution - this matches on common
// header names (case-insensitive, exact then partial) rather than
// requiring one fixed format, since Dhanu's accounts span NAB, ANZ, and
// Commercial Bank (Sri Lanka).
const DATE_HEADERS = ["date", "transaction date", "posting date", "value date", "txn date"];
const DESC_HEADERS = ["description", "narrative", "details", "particulars", "memo", "transaction details", "reference"];
const AMOUNT_HEADERS = ["amount", "transaction amount", "value"];
const DEBIT_HEADERS = ["debit", "withdrawal", "debit amount", "money out", "paid out", "dr"];
const CREDIT_HEADERS = ["credit", "deposit", "credit amount", "money in", "paid in", "cr"];

function normalize(h: string): string {
  return h.trim().toLowerCase();
}

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const exact = headers.find((h) => normalize(h) === c);
    if (exact) return exact;
  }
  for (const c of candidates) {
    const partial = headers.find((h) => normalize(h).includes(c));
    if (partial) return partial;
  }
  return null;
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  // Accounting-style negatives are sometimes wrapped in parens: (123.45)
  const wrapped = raw.trim().match(/^\((.+)\)$/);
  const cleaned = (wrapped ? `-${wrapped[1]}` : raw).replace(/[,$\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Tries ISO (YYYY-MM-DD) first, then DD/MM/YYYY or MM/DD/YYYY with
// separators of /, -, or . - defaults to DD/MM (AU/UK/LK convention,
// matching every bank in this app) when the day/month split is
// genuinely ambiguous (both parts <= 12).
function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  // Date.UTC, not the local-timezone Date(y, m, d) constructor - a manually
  // entered transaction's "YYYY-MM-DD" form value goes through
  // z.coerce.date(), which per the ISO 8601 spec parses a date-only string
  // as UTC midnight. Building these with local midnight instead would
  // store a calendar date that's off by one whenever the server process's
  // timezone has a non-zero offset (confirmed: this exact bug happened in
  // testing).
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const [, a, b, yRaw] = m;
    const year = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    const first = Number(a);
    const second = Number(b);
    let day: number;
    let month: number;
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      day = second;
      month = first;
    } else {
      day = first;
      month = second;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function parseStatementCsv(text: string): { candidates: StatementCandidate[]; error?: string } {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  const headers = parsed.meta.fields ?? [];
  if (rows.length === 0 || headers.length === 0) {
    return { candidates: [], error: "Couldn't find any rows in this file - is it a CSV export?" };
  }

  const dateCol = findColumn(headers, DATE_HEADERS);
  const descCol = findColumn(headers, DESC_HEADERS);
  const amountCol = findColumn(headers, AMOUNT_HEADERS);
  const debitCol = findColumn(headers, DEBIT_HEADERS);
  const creditCol = findColumn(headers, CREDIT_HEADERS);

  if (!dateCol) {
    return { candidates: [], error: `Couldn't find a date column. Columns found: ${headers.join(", ")}` };
  }
  if (!amountCol && !debitCol && !creditCol) {
    return {
      candidates: [],
      error: `Couldn't find an amount (or debit/credit) column. Columns found: ${headers.join(", ")}`,
    };
  }

  const candidates: StatementCandidate[] = [];
  for (const row of rows) {
    const date = parseDate(row[dateCol]);
    if (!date) continue;

    let amount: number | null = null;
    if (amountCol) {
      amount = parseAmount(row[amountCol]);
    } else {
      const debit = debitCol ? parseAmount(row[debitCol]) : null;
      const credit = creditCol ? parseAmount(row[creditCol]) : null;
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }
    if (amount == null || amount === 0) continue;

    const description = (descCol ? row[descCol] : "")?.trim() || "Imported transaction";
    candidates.push({ date, description, amount });
  }

  if (candidates.length === 0) {
    return { candidates: [], error: "Found the right columns, but no valid transaction rows in them." };
  }
  return { candidates };
}

// Flags each candidate as a likely duplicate of something already recorded
// on this account: same sign (income/expense), amount equal to the cent,
// date within a day either way. Approximate on purpose - the review step
// lets Dhanu override either direction rather than trusting this blindly.
export async function flagDuplicates(
  userId: string,
  accountId: string,
  candidates: StatementCandidate[],
): Promise<boolean[]> {
  if (candidates.length === 0) return [];

  const times = candidates.map((c) => c.date.getTime());
  const existing = await prisma.transaction.findMany({
    where: {
      userId,
      accountId,
      date: { gte: new Date(Math.min(...times) - 86_400_000), lt: new Date(Math.max(...times) + 2 * 86_400_000) },
    },
    select: { date: true, amount: true, type: true },
  });

  return candidates.map((c) => {
    const isIncome = c.amount > 0;
    const magnitude = Math.abs(c.amount);
    return existing.some((e) => {
      const dayDiff = Math.abs(e.date.getTime() - c.date.getTime()) / 86_400_000;
      if (dayDiff > 1.5) return false;
      // EXPENSE/INCOME store a positive magnitude with sign implied by
      // type; TRANSFER already stores a signed amount - see the
      // TransactionRow comment in transactions-list.tsx for the same rule.
      const existingSigned = e.type === "EXPENSE" ? -e.amount.toNumber() : e.amount.toNumber();
      if ((existingSigned > 0) !== isIncome) return false;
      return Math.abs(Math.abs(existingSigned) - magnitude) < 0.01;
    });
  });
}

// Matches a candidate's free-text description against the names of the
// user's OTHER accounts (bank-to-bank transfers, loan repayments off a
// linked account, etc. all show up this way in a single-account statement
// export - there's no other signal to go on). Same-currency only, matching
// the existing rule that real transfers created elsewhere in this app
// require both legs to share a currency. Longest name first so a more
// specific account ("NAB Loan Nanduni") wins over a shorter one that
// happens to be a substring of it ("NAB").
export async function matchTransferAccounts(
  userId: string,
  sourceAccountId: string,
  sourceCurrency: string,
  candidates: StatementCandidate[],
): Promise<({ id: string; name: string } | null)[]> {
  const otherAccounts = await prisma.financialAccount.findMany({
    where: { userId, id: { not: sourceAccountId }, archived: false, currency: sourceCurrency },
    select: { id: true, name: true },
  });
  if (otherAccounts.length === 0) return candidates.map(() => null);

  const sorted = [...otherAccounts].sort((a, b) => b.name.length - a.name.length);
  return candidates.map((c) => {
    const descLower = c.description.toLowerCase();
    return sorted.find((a) => descLower.includes(a.name.toLowerCase())) ?? null;
  });
}
