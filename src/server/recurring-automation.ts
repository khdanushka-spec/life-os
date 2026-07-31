import "server-only";
import { prisma } from "@/lib/prisma";
import { advanceByInterval } from "@/lib/date";

// A payment left unprocessed for a long time (e.g. WEEKLY, untouched for
// over a year) shouldn't create 50+ transactions in one burst - cap how
// many occurrences a single run will catch up on. The remaining ones catch
// up on the next run since nextDueDate only advances past what's actually
// been processed.
const MAX_OCCURRENCES_PER_RUN = 26;

// Runs whenever the Finance pages load (same "catch up lazily" pattern as
// ensureTodaysNetWorthSnapshot) rather than a true cron - this app has no
// background worker. Only payments with autoPay on AND a nominated account
// are touched; everything else is left for Dhanu to log manually, same as
// today. Idempotent: nextDueDate only advances inside the same transaction
// that creates the Transaction row and adjusts the balance, so a run that's
// interrupted or repeated can't double-process an occurrence.
export async function processDueRecurringPayments(userId: string): Promise<{ processedCount: number }> {
  const today = new Date();
  const due = await prisma.recurringPayment.findMany({
    where: { userId, active: true, autoPay: true, accountId: { not: null }, nextDueDate: { lte: today } },
  });

  let processedCount = 0;
  for (const payment of due) {
    if (!payment.accountId) continue; // narrows for TS; already filtered in the query
    let nextDueDate = payment.nextDueDate;
    let guard = 0;
    while (nextDueDate <= today && guard < MAX_OCCURRENCES_PER_RUN) {
      guard++;
      const occurrenceDate = nextDueDate;
      const advanced = advanceByInterval(nextDueDate, payment.interval);
      const isExpense = payment.type === "EXPENSE";

      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            userId,
            accountId: payment.accountId,
            type: payment.type,
            amount: payment.amount,
            currency: payment.currency,
            category: payment.category,
            description: `Auto: ${payment.name}`,
            date: occurrenceDate,
            recurringId: payment.id,
          },
        }),
        prisma.financialAccount.update({
          where: { id: payment.accountId },
          data: { balance: isExpense ? { decrement: payment.amount } : { increment: payment.amount } },
        }),
        prisma.recurringPayment.update({
          where: { id: payment.id },
          data: { nextDueDate: advanced },
        }),
      ]);

      nextDueDate = advanced;
      processedCount++;
    }
  }

  return { processedCount };
}
