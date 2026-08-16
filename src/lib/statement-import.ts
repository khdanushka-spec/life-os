import "server-only";
import Papa from "papaparse";
// Type-only import - erased entirely at compile time, so it doesn't
// trigger pdf-parse's (and pdfjs-dist's) runtime module evaluation. The
// real, value-level import is dynamic, inside parseStatementPdf - see the
// Canvas-polyfill comment below for why.
import type { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/prisma";

// pdfjs-dist (which pdf-parse wraps) references browser Canvas APIs at
// module-evaluation time even though this app only ever uses it for text
// extraction, never rendering - without these, Vercel's Node serverless
// runtime throws "ReferenceError: DOMMatrix is not defined" and takes
// down the entire module (confirmed in production, on every statement
// upload, CSV included - a *static* `import { PDFParse } from "pdf-parse"`
// here would get hoisted and evaluated as soon as this file loads,
// regardless of whether parseStatementPdf is ever called). These are
// intentionally minimal no-op stand-ins: nothing in this app's usage
// actually renders through them, they just need to exist so pdfjs-dist's
// optional-canvas-polyfill code path doesn't throw. pdf-parse itself is
// imported dynamically inside parseStatementPdf, after these run, since
// static imports would be hoisted above this and crash before it helps.
if (typeof globalThis.DOMMatrix === "undefined") {
  // @ts-expect-error - deliberately minimal, not a real DOMMatrix
  globalThis.DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.ImageData === "undefined") {
  // @ts-expect-error - deliberately minimal, not a real ImageData
  globalThis.ImageData = class ImageData {};
}
if (typeof globalThis.Path2D === "undefined") {
  // @ts-expect-error - deliberately minimal, not a real Path2D
  globalThis.Path2D = class Path2D {};
}

export type StatementCandidate = {
  date: Date;
  description: string;
  amount: number; // signed: positive = income/credit, negative = expense/debit
  // Set only by PDF parsing, where the sign has to be inferred (see
  // parseStatementPdf) rather than read off an explicit debit/credit
  // column - true means "double-check this one before importing."
  uncertainSign?: boolean;
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

const PDF_DATE_START =
  /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i;
const MONEY_TOKEN = /\(?-?\$?\d[\d,]*\.\d{2}\)?/g;

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

// A "DD Mon YYYY" match isn't handled by parseDate() (that's for
// CSV-style numeric dates) - PDF statements commonly print dates this way.
function parsePdfDate(raw: string): Date | null {
  const numeric = parseDate(raw);
  if (numeric) return numeric;
  const m = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{2,4})/);
  if (!m) return null;
  const [, d, monStr, yRaw] = m;
  const month = MONTH_INDEX[monStr.toLowerCase()];
  if (month == null) return null;
  const year = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
  const date = new Date(Date.UTC(year, month, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

// PDF bank statements are formatted for human reading, not structured
// data, so this is inherently best-effort - it extracts raw text (pdf-parse
// / pdf.js under the hood) and looks for lines shaped like
// "<date> <description> <amount> <running balance>". The balance column,
// when present, is what makes the sign detection reliable: the delta
// between consecutive rows' balances tells you whether that row was money
// in or out far more robustly than guessing from the text alone. Rows
// where that signal isn't available get amount.uncertainSign = true and
// the review screen defaults them unchecked - never silently guessed into
// an import.
export async function parseStatementPdf(buffer: Buffer): Promise<{ candidates: StatementCandidate[]; error?: string }> {
  let text: string;
  let parser: PDFParse | undefined;
  try {
    const { PDFParse } = await import("pdf-parse");
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = result.text;
  } catch (err) {
    console.error("PDF statement parse failed:", err);
    return { candidates: [], error: "Couldn't read this PDF - make sure it's a text-based statement, not a scanned image." };
  } finally {
    await parser?.destroy();
  }

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rawRows: { date: Date; description: string; numbers: number[] }[] = [];
  for (const line of lines) {
    const dateMatch = line.match(PDF_DATE_START);
    if (!dateMatch) continue;
    const date = parsePdfDate(dateMatch[0]);
    if (!date) continue;

    const numberTokens = line.slice(dateMatch[0].length).match(MONEY_TOKEN);
    if (!numberTokens || numberTokens.length === 0) continue;
    const numbers = numberTokens.map((t) => parseAmount(t)).filter((n): n is number => n != null);
    if (numbers.length === 0) continue;

    let description = line.slice(dateMatch[0].length);
    for (const token of numberTokens) description = description.replace(token, "");
    description = description.replace(/\s{2,}/g, " ").trim() || "Imported transaction";

    rawRows.push({ date, description, numbers });
  }

  if (rawRows.length === 0) {
    return {
      candidates: [],
      error: "Couldn't find any transaction-looking lines in this PDF. A CSV export from your bank, if available, will be far more reliable.",
    };
  }

  // Last number on the line = running balance (near-universal statement
  // convention); the number before it = the transaction amount.
  const candidates: StatementCandidate[] = [];
  let prevBalance: number | null = null;
  for (const row of rawRows) {
    const hasBalance = row.numbers.length >= 2;
    const balance = hasBalance ? row.numbers[row.numbers.length - 1] : null;
    const magnitude = Math.abs(hasBalance ? row.numbers[row.numbers.length - 2] : row.numbers[0]);

    let amount: number;
    let uncertainSign = true;
    if (balance != null && prevBalance != null) {
      const delta = balance - prevBalance;
      amount = delta >= 0 ? magnitude : -magnitude;
      // Balance delta should roughly match the extracted amount - if it
      // doesn't, something in this row (or the one before it) parsed
      // wrong, so flag it rather than trust either number.
      uncertainSign = Math.abs(Math.abs(delta) - magnitude) > 0.02;
    } else {
      amount = -magnitude; // best guess only - most statement lines are debits
    }

    candidates.push({ date: row.date, description: row.description, amount, uncertainSign });
    if (balance != null) prevBalance = balance;
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
