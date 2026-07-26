"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseFormDialog } from "@/components/learning/course-form-dialog";

export function CoursesHeader() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="text-sm text-muted-foreground">What you&apos;re learning, and how far along.</p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Add Course
      </Button>
      <CourseFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
