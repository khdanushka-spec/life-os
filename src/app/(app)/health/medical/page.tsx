import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { MedicalHeader } from "@/components/health/medical-header";
import { MedicalRecordRow } from "@/components/health/medical-record-row";

export default async function MedicalRecordsPage() {
  const dbUser = await requireDbUser();

  const records = await prisma.medicalRecord.findMany({
    where: { userId: dbUser.id },
    orderBy: { date: "desc" },
  });

  const now = new Date();
  const upcomingFollowUps = records
    .filter((r) => r.followUpDate && r.followUpDate >= now)
    .sort((a, b) => a.followUpDate!.getTime() - b.followUpDate!.getTime());

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/health" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Health
      </Link>
      <MedicalHeader />

      {upcomingFollowUps.length > 0 && (
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Upcoming Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcomingFollowUps.map((r) => (
              <MedicalRecordRow key={r.id} record={r} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">All Records</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {records.length === 0 && <p className="text-sm text-muted-foreground">No medical records yet.</p>}
          {records.map((r) => (
            <MedicalRecordRow key={r.id} record={r} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
