import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { CertificatesHeader } from "@/components/learning/certificates-header";
import { CertificateRow } from "@/components/learning/certificate-row";

export default async function CertificatesPage() {
  const dbUser = await requireDbUser();

  const certificates = await prisma.certificate.findMany({
    where: { userId: dbUser.id },
    orderBy: { issueDate: "desc" },
  });

  const now = new Date();
  const upcomingExpiries = certificates
    .filter((c) => c.expiryDate && c.expiryDate >= now)
    .sort((a, b) => a.expiryDate!.getTime() - b.expiryDate!.getTime());

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/learning" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Learning
      </Link>
      <CertificatesHeader />

      {upcomingExpiries.length > 0 && (
        <Card className="border-none bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Upcoming Expiries</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcomingExpiries.map((c) => (
              <CertificateRow key={c.id} certificate={c} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">All Certificates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {certificates.length === 0 && <p className="text-sm text-muted-foreground">No certificates added yet.</p>}
          {certificates.map((c) => (
            <CertificateRow key={c.id} certificate={c} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
