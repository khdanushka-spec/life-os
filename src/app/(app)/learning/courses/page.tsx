import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/server/db-user";
import { CoursesHeader } from "@/components/learning/courses-header";
import { CourseRow } from "@/components/learning/course-row";
import type { CourseStatus } from "@/generated/prisma/client";

const STATUS_ORDER: Record<CourseStatus, number> = {
  IN_PROGRESS: 0,
  NOT_STARTED: 1,
  PAUSED: 2,
  COMPLETED: 3,
};

export default async function CoursesPage() {
  const dbUser = await requireDbUser();

  const courses = await prisma.course.findMany({
    where: { userId: dbUser.id },
    orderBy: { updatedAt: "desc" },
  });
  const sorted = [...courses].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <Link href="/learning" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to Learning
      </Link>
      <CoursesHeader />

      <Card className="border-none bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">All Courses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {sorted.length === 0 && <p className="text-sm text-muted-foreground">No courses added yet.</p>}
          {sorted.map((c) => (
            <CourseRow key={c.id} course={c} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
