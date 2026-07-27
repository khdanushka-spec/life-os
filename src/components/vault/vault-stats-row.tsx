"use client";

import { Archive, FileText, Link2, HelpCircle } from "lucide-react";
import { StatCard } from "@/components/stat-card";

export function VaultStatsRow({
  totalItems,
  notes,
  links,
  uncategorized,
}: {
  totalItems: number;
  notes: number;
  links: number;
  uncategorized: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={Archive} label="Total Items" value={totalItems} accent="bg-primary" />
      <StatCard icon={FileText} label="Notes" value={notes} accent="bg-violet-500" />
      <StatCard icon={Link2} label="Links" value={links} accent="bg-sky-500" />
      <StatCard icon={HelpCircle} label="Uncategorized" value={uncategorized} accent="bg-amber-500" />
    </div>
  );
}
