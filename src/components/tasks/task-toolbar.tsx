"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { List, Kanban, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PRIORITY_META } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "dueDate", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "created", label: "Created" },
];

export function TaskToolbar({ view }: { view: "list" | "board" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-40">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value || null)}
          placeholder="Search tasks..."
          className="h-8 pl-8"
        />
      </div>
      <Select value={searchParams.get("priority") ?? "all"} onValueChange={(v) => setParam("priority", v === "all" ? null : (v as string))}>
        <SelectTrigger className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {Object.entries(PRIORITY_META).map(([value, meta]) => (
            <SelectItem key={value} value={value}>
              {meta.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={searchParams.get("sort") ?? "dueDate"} onValueChange={(v) => setParam("sort", v as string)}>
        <SelectTrigger className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1 rounded-lg border p-0.5">
        <button
          type="button"
          aria-label="List view"
          onClick={() => setParam("view", null)}
          className={cn("flex size-7 items-center justify-center rounded-md", view === "list" && "bg-muted")}
        >
          <List className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Board view"
          onClick={() => setParam("view", "board")}
          className={cn("flex size-7 items-center justify-center rounded-md", view === "board" && "bg-muted")}
        >
          <Kanban className="size-3.5" />
        </button>
      </div>
      <Button variant="outline" size="sm" onClick={() => router.push("/tasks/analytics")}>
        Analytics
      </Button>
    </div>
  );
}
