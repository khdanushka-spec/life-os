"use client";

import { Briefcase, CalendarClock, Users2, ListChecks } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export function WorkStatsRow({
  activeProjects,
  upcomingDeadlines,
  meetingsThisWeek,
  openTasks,
}: {
  activeProjects: number;
  upcomingDeadlines: number;
  meetingsThisWeek: number;
  openTasks: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={Briefcase} label="Active Projects" value={activeProjects} accent="bg-primary" />
      <StatCard icon={CalendarClock} label="Upcoming Deadlines" value={upcomingDeadlines} accent="bg-amber-500" />
      <StatCard icon={Users2} label="Meetings This Week" value={meetingsThisWeek} accent="bg-sky-500" />
      <StatCard icon={ListChecks} label="Open Tasks" value={openTasks} accent="bg-emerald-500" />
    </div>
  );
}
