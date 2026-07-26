import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export type CourseSummary = {
  id: string;
  title: string;
  progressPercent: number;
};

export function RecentCourses({ courses }: { courses: CourseSummary[] }) {
  return (
    <Card className="border-none bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Courses In Progress</CardTitle>
        <Link href="/learning/courses" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {courses.length === 0 && <p className="text-sm text-muted-foreground">No courses in progress.</p>}
        {courses.map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-sm">
            <BookOpen className="size-3.5 shrink-0 text-sky-500" />
            <span className="flex-1 truncate">{c.title}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{c.progressPercent}%</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
