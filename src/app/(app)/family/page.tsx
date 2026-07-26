import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { buttonVariants } from "@/components/ui/button";
import { daysUntilAnnualDate } from "@/lib/family";
import { getOrGenerateDailyInsight } from "@/lib/ai/family";
import { FamilyStatsRow } from "@/components/family/family-stats-row";
import { FamilyInsightCard } from "@/components/family/family-insight-card";
import { UpcomingBirthdays } from "@/components/family/upcoming-birthdays";
import { UpcomingEvents } from "@/components/family/upcoming-events";
import { GiftIdeasQuickList } from "@/components/family/gift-ideas-quick-list";
import { MembersQuickList } from "@/components/family/members-quick-list";

const SUB_PAGES = [
  { href: "/family/members", label: "Members" },
  { href: "/family/events", label: "Events" },
  { href: "/family/gifts", label: "Gift Ideas" },
  { href: "/family/documents", label: "Documents" },
  { href: "/family/reports", label: "Reports" },
];

export default async function FamilyPage() {
  const dbUser = await requireDbUser();

  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 86_400_000);

  const [members, upcomingEventsRaw, openGiftIdeasCount, recentGiftIdeas, dailyInsight] = await Promise.all([
    prisma.familyMember.findMany({ where: { userId: dbUser.id, archived: false }, orderBy: { name: "asc" } }),
    prisma.familyEvent.findMany({
      where: { userId: dbUser.id, date: { gte: now, lt: thirtyDaysAhead } },
      include: { member: true },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.giftIdea.count({ where: { userId: dbUser.id, status: "IDEA" } }),
    prisma.giftIdea.findMany({
      where: { userId: dbUser.id },
      include: { member: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    getOrGenerateDailyInsight(dbUser.id),
  ]);

  const upcomingBirthdays = members
    .filter((m) => m.birthday != null)
    .map((m) => ({ id: m.id, name: m.name, days: daysUntilAnnualDate(m.birthday!, now) }))
    .filter((b) => b.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Family</h1>
        <p className="text-sm text-muted-foreground">Birthdays, events, and gift ideas — never forget what matters.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUB_PAGES.map((p) => (
          <Link key={p.href} href={p.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {p.label}
          </Link>
        ))}
      </div>

      <FamilyStatsRow
        totalMembers={members.length}
        upcomingBirthdays={upcomingBirthdays.length}
        upcomingEvents={upcomingEventsRaw.length}
        openGiftIdeas={openGiftIdeasCount}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <UpcomingBirthdays birthdays={upcomingBirthdays} />
          <UpcomingEvents
            events={upcomingEventsRaw.map((e) => ({ id: e.id, title: e.title, type: e.type, date: e.date, memberName: e.member?.name ?? null }))}
          />
        </div>
        <div className="flex flex-col gap-6">
          <FamilyInsightCard insight={dailyInsight} />
          <GiftIdeasQuickList
            giftIdeas={recentGiftIdeas.map((g) => ({ id: g.id, title: g.title, memberName: g.member.name, status: g.status }))}
          />
          <MembersQuickList members={members.map((m) => ({ id: m.id, name: m.name, relationship: m.relationship }))} />
        </div>
      </div>
    </div>
  );
}
