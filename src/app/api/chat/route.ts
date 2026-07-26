import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { resolveAiModel } from "@/lib/ai/providers";
import { getDbUser } from "@/server/db-user";
import { prisma } from "@/lib/prisma";
import { todayDateKey } from "@/lib/habits";
import { moodMeta } from "@/lib/journal";
import { startOfMonth } from "@/lib/date";
import { computeNetWorth, decToNumber, formatCurrency, occurrencesInRange } from "@/lib/finance";
import { PRIORITY_META } from "@/lib/tasks";
import { PROJECT_STATUS_META } from "@/lib/work";
import { MEDICAL_RECORD_TYPE_META } from "@/lib/health";
import { COURSE_STATUS_META, BOOK_STATUS_META } from "@/lib/learning";
import { daysUntilAnnualDate, FAMILY_EVENT_TYPE_META, GIFT_IDEA_STATUS_META } from "@/lib/family";
import { TRIP_STATUS_META, BOOKING_TYPE_META } from "@/lib/travel";
import { VAULT_ITEM_TYPE_META } from "@/lib/vault";

export async function POST(req: Request) {
  const dbUser = await getDbUser();
  if (!dbUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resolved = await resolveAiModel();
  if (!resolved) {
    return new Response(
      "No AI provider available. Start Ollama (localhost:11434), or set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
      { status: 503 },
    );
  }

  const tasks = await prisma.task.findMany({
    where: { userId: dbUser.id, parentId: null, status: { notIn: ["DONE"] } },
    include: { project: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 20,
  });

  const nowForTasks = new Date();
  const taskSummary = tasks.length
    ? tasks
        .map((t) => {
          const bits = [
            `[${PRIORITY_META[t.priority].label}]`,
            t.dueDate
              ? `due ${t.dueDate.toDateString()}${t.dueDate < nowForTasks ? " (overdue)" : ""}`
              : "no due date",
            t.project ? `project: ${t.project.name}` : null,
            t.energy ? `energy: ${t.energy}` : null,
          ]
            .filter(Boolean)
            .join(", ");
          return `- ${t.title} - ${bits}`;
        })
        .join("\n")
    : "No pending tasks right now.";

  const habits = await prisma.habit.findMany({
    where: { userId: dbUser.id, archived: false },
    include: { logs: { where: { date: new Date(todayDateKey()) } } },
  });
  const habitSummary = habits.length
    ? habits
        .map((h) => `- ${h.title}: ${h.logs.length > 0 ? "done today" : "not done yet today"}`)
        .join("\n")
    : "No habits being tracked right now.";

  const journalEntries = await prisma.journalEntry.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const journalSummary = journalEntries.length
    ? journalEntries
        .map((e) => {
          const mood = moodMeta(e.mood);
          const preview =
            e.contentText.length > 200 ? `${e.contentText.slice(0, 200)}...` : e.contentText;
          const tags = e.tags.length ? ` [${e.tags.join(", ")}]` : "";
          const gratitude = e.gratitude.length ? ` Grateful for: ${e.gratitude.join("; ")}.` : "";
          return `- ${e.createdAt.toDateString()}${mood ? ` (feeling ${mood.label.toLowerCase()})` : ""}${tags}: ${preview || "(no text)"}${gratitude}`;
        })
        .join("\n")
    : "No journal entries yet.";

  const monthStart = startOfMonth(new Date());
  const [accounts, investments, assetsLiabilities, budgets, monthExpenses, upcomingBills] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId: dbUser.id, archived: false } }),
    prisma.investment.findMany({ where: { userId: dbUser.id } }),
    prisma.assetLiability.findMany({ where: { userId: dbUser.id } }),
    prisma.budget.findMany({ where: { userId: dbUser.id, month: monthStart } }),
    prisma.transaction.findMany({ where: { userId: dbUser.id, type: "EXPENSE", date: { gte: monthStart } } }),
    prisma.recurringPayment.findMany({ where: { userId: dbUser.id, active: true } }),
  ]);

  const { netWorth } = computeNetWorth({
    accounts: accounts.map((a) => ({ type: a.type, balance: decToNumber(a.balance) })),
    investments: investments.map((i) => ({ currentValue: decToNumber(i.currentValue) })),
    assetsLiabilities: assetsLiabilities.map((a) => ({ kind: a.kind, value: decToNumber(a.value) })),
  });

  const spendByCategory: Record<string, number> = {};
  for (const t of monthExpenses) {
    spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + decToNumber(t.amount);
  }
  const budgetSummary = budgets.length
    ? budgets
        .map((b) => `- ${b.category}: ${formatCurrency(spendByCategory[b.category] ?? 0)} of ${formatCurrency(decToNumber(b.monthlyLimit))} budgeted`)
        .join("\n")
    : "No budgets set this month.";

  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const now = new Date();
  const upcomingLines = upcomingBills
    .flatMap((r) => occurrencesInRange(r.nextDueDate, r.interval, now, in7Days).map((date) => ({ r, date })))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ r, date }) => `- ${r.name}: ${formatCurrency(decToNumber(r.amount))} due ${date.toDateString()}`);
  const upcomingSummary = upcomingLines.length ? upcomingLines.join("\n") : "No bills due in the next 7 days.";

  const [workProjects, upcomingMeetings] = await Promise.all([
    prisma.project.findMany({
      where: { userId: dbUser.id, kind: "WORK", archived: false, status: { in: ["ACTIVE", "ON_HOLD"] } },
      include: { client: true },
      orderBy: { deadline: "asc" },
      take: 15,
    }),
    prisma.meeting.findMany({
      where: { userId: dbUser.id, startTime: { gte: now, lt: in7Days } },
      include: { project: true, client: true },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
  ]);

  const workSummary = workProjects.length
    ? workProjects
        .map((p) => {
          const bits = [
            `[${PROJECT_STATUS_META[p.status].label}]`,
            p.deadline ? `deadline ${p.deadline.toDateString()}${p.deadline < now ? " (overdue)" : ""}` : "no deadline",
            p.client ? `client: ${p.client.name}` : null,
          ]
            .filter(Boolean)
            .join(", ");
          return `- ${p.name} - ${bits}`;
        })
        .join("\n")
    : "No active work projects.";

  const meetingsSummary = upcomingMeetings.length
    ? upcomingMeetings
        .map(
          (m) =>
            `- ${m.title} at ${m.startTime.toLocaleString()}${m.project ? ` (${m.project.name})` : ""}${m.client ? ` with ${m.client.name}` : ""}`,
        )
        .join("\n")
    : "No meetings scheduled in the next 7 days.";

  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const [recentHealthLogs, recentWorkouts, upcomingFollowUps] = await Promise.all([
    prisma.dailyHealthLog.findMany({ where: { userId: dbUser.id, date: { gte: weekAgo } }, orderBy: { date: "asc" } }),
    prisma.workout.findMany({ where: { userId: dbUser.id, performedAt: { gte: weekAgo } }, orderBy: { performedAt: "asc" } }),
    prisma.medicalRecord.findMany({
      where: { userId: dbUser.id, followUpDate: { gte: now, lt: in7Days } },
      orderBy: { followUpDate: "asc" },
    }),
  ]);

  const healthLogSummary = recentHealthLogs.length
    ? recentHealthLogs
        .map((l) => {
          const bits = [
            l.waterMl != null ? `water ${l.waterMl}ml` : null,
            l.sleepHours != null ? `slept ${l.sleepHours}h` : null,
            l.wellbeingScore != null ? `wellbeing ${l.wellbeingScore}/10` : null,
          ]
            .filter(Boolean)
            .join(", ");
          return bits ? `- ${l.date.toDateString()}: ${bits}` : null;
        })
        .filter(Boolean)
        .join("\n") || "No daily check-ins logged this week."
    : "No daily check-ins logged this week.";

  const workoutsSummary = recentWorkouts.length
    ? recentWorkouts.map((w) => `- ${w.type} on ${w.performedAt.toDateString()}`).join("\n")
    : "No workouts logged this week.";

  const followUpsSummary = upcomingFollowUps.length
    ? upcomingFollowUps
        .map((f) => `- ${MEDICAL_RECORD_TYPE_META[f.type].label}: ${f.title} due ${f.followUpDate!.toDateString()}`)
        .join("\n")
    : "No medical follow-ups due in the next 7 days.";

  const [recentStudyLogs, activeCourses, activeBooks] = await Promise.all([
    prisma.studyLog.findMany({ where: { userId: dbUser.id, date: { gte: weekAgo } }, orderBy: { date: "asc" } }),
    prisma.course.findMany({ where: { userId: dbUser.id, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" }, take: 15 }),
    prisma.book.findMany({ where: { userId: dbUser.id, status: "READING" }, orderBy: { updatedAt: "desc" }, take: 15 }),
  ]);

  const studyLogSummary = recentStudyLogs.length
    ? recentStudyLogs
        .map((l) => {
          const bits = [
            l.minutesStudied != null ? `${l.minutesStudied} min` : null,
            l.focusScore != null ? `focus ${l.focusScore}/5` : null,
          ]
            .filter(Boolean)
            .join(", ");
          return bits ? `- ${l.date.toDateString()}: ${bits}` : null;
        })
        .filter(Boolean)
        .join("\n") || "No study sessions logged this week."
    : "No study sessions logged this week.";

  const coursesSummary = activeCourses.length
    ? activeCourses.map((c) => `- "${c.title}" [${COURSE_STATUS_META[c.status].label}] - ${c.progressPercent}% complete`).join("\n")
    : "No courses in progress.";

  const booksSummary = activeBooks.length
    ? activeBooks
        .map((b) => `- "${b.title}"${b.author ? ` by ${b.author}` : ""} [${BOOK_STATUS_META[b.status].label}]`)
        .join("\n")
    : "No books currently being read.";

  const thirtyDaysAhead = new Date(now.getTime() + 30 * 86_400_000);
  const [membersWithBirthday, upcomingFamilyEvents, openGiftIdeas] = await Promise.all([
    prisma.familyMember.findMany({ where: { userId: dbUser.id, archived: false, birthday: { not: null } } }),
    prisma.familyEvent.findMany({
      where: { userId: dbUser.id, date: { gte: now, lt: thirtyDaysAhead } },
      include: { member: true },
      orderBy: { date: "asc" },
    }),
    prisma.giftIdea.findMany({ where: { userId: dbUser.id, status: "IDEA" }, include: { member: true }, take: 20 }),
  ]);

  const upcomingBirthdaysSummary = membersWithBirthday
    .map((m) => ({ name: m.name, days: daysUntilAnnualDate(m.birthday!, now) }))
    .filter((b) => b.days <= 30)
    .sort((a, b) => a.days - b.days)
    .map((b) => `- ${b.name} in ${b.days} day${b.days === 1 ? "" : "s"}`)
    .join("\n") || "No birthdays in the next 30 days.";

  const familyEventsSummary = upcomingFamilyEvents.length
    ? upcomingFamilyEvents
        .map((e) => `- "${e.title}" [${FAMILY_EVENT_TYPE_META[e.type].label}] on ${e.date.toDateString()}${e.member ? ` (${e.member.name})` : ""}`)
        .join("\n")
    : "No events in the next 30 days.";

  const giftIdeasSummary = openGiftIdeas.length
    ? openGiftIdeas
        .map((g) => `- ${g.title} for ${g.member.name}${g.occasion ? ` (${g.occasion})` : ""} [${GIFT_IDEA_STATUS_META[g.status].label}]`)
        .join("\n")
    : "No open gift ideas.";

  const upcomingTrips = await prisma.trip.findMany({
    where: { userId: dbUser.id, status: { in: ["PLANNING", "UPCOMING", "ONGOING"] } },
    include: { bookings: true, packingItems: true },
    orderBy: { startDate: "asc" },
  });

  const tripsSummary = upcomingTrips.length
    ? upcomingTrips
        .map((t) => {
          const packedCount = t.packingItems.filter((p) => p.packed).length;
          const bits = [
            `[${TRIP_STATUS_META[t.status].label}]`,
            t.startDate ? `starts ${t.startDate.toDateString()}` : "no start date set",
            t.bookings.length ? `${t.bookings.length} booking${t.bookings.length === 1 ? "" : "s"} (${t.bookings.map((b) => BOOKING_TYPE_META[b.type].label).join(", ")})` : "no bookings yet",
            t.packingItems.length ? `packing ${packedCount}/${t.packingItems.length}` : "no packing list",
          ];
          return `- ${t.destination}${t.country ? `, ${t.country}` : ""} - ${bits.join(", ")}`;
        })
        .join("\n")
    : "No trips currently planned.";

  const [recentVaultItems, favoritedVaultItems] = await Promise.all([
    prisma.vaultItem.findMany({ where: { userId: dbUser.id }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.vaultItem.findMany({ where: { userId: dbUser.id, favorited: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
  ]);

  const formatVaultItem = (i: (typeof recentVaultItems)[number]) => {
    const preview = i.contentText.length > 150 ? `${i.contentText.slice(0, 150)}...` : i.contentText;
    return `- "${i.title}" [${VAULT_ITEM_TYPE_META[i.type].label}]${i.category ? ` (${i.category})` : ""}${i.tags.length ? ` tags: ${i.tags.join(", ")}` : ""}${preview ? ` - ${preview}` : ""}`;
  };

  const recentVaultSummary = recentVaultItems.length ? recentVaultItems.map(formatVaultItem).join("\n") : "Nothing saved yet.";
  const favoritedVaultSummary = favoritedVaultItems.length ? favoritedVaultItems.map(formatVaultItem).join("\n") : "No favorited items.";

  const system = `You are Aura Brain inside AURA OS, a calm, AI-first personal life-management app. Be concise, warm, and direct - this is a personal assistant, not a customer support bot.

You currently only have visibility into the user's pending tasks, daily habits, recent journal entries, finances, work (projects, clients, meetings), health (daily check-ins, workouts, medical follow-ups), learning (study sessions, courses, books), family (birthdays, events, gift ideas), travel (trips, bookings, packing), and their knowledge vault (saved notes and links). You only see the most recent and favorited vault items below, not the full vault - if asked about something not listed, say you don't see it in what's shown to you rather than guessing. Don't claim to know about their calendar or other life areas - those modules don't exist yet. Never give medical advice on health data, only observations about their own logged patterns.

CRITICAL for finance: only ever state the numbers given to you below. Never estimate, guess, or invent a dollar figure, balance, or trend that isn't explicitly present in this context.

Their current pending tasks:
${taskSummary}

Their habits and today's status:
${habitSummary}

Their recent journal entries (most recent first):
${journalSummary}

Their net worth: ${formatCurrency(netWorth)}

Their budgets this month:
${budgetSummary}

Bills due in the next 7 days:
${upcomingSummary}

Their active work projects:
${workSummary}

Their meetings in the next 7 days:
${meetingsSummary}

Their health check-ins this week:
${healthLogSummary}

Their workouts this week:
${workoutsSummary}

Their upcoming medical follow-ups (next 7 days):
${followUpsSummary}

Their study sessions this week:
${studyLogSummary}

Their courses in progress:
${coursesSummary}

Their books currently reading:
${booksSummary}

Their upcoming family birthdays (next 30 days):
${upcomingBirthdaysSummary}

Their upcoming family events (next 30 days):
${familyEventsSummary}

Their open gift ideas (not yet purchased):
${giftIdeasSummary}

Their planned/upcoming trips:
${tripsSummary}

Their most recently updated vault items:
${recentVaultSummary}

Their favorited vault items:
${favoritedVaultSummary}`;

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: resolved.model,
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
