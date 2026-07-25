"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ListChecks, Clock, AlertCircle, Mail, Loader2 } from "lucide-react";
import {
  suggestSubtasksAction,
  applySuggestedSubtasksAction,
  suggestPriorityAction,
  suggestEstimateAction,
  explainBlockersAction,
  draftMessageAction,
  updateTaskAction,
} from "@/server/actions/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRIORITY_META } from "@/lib/tasks";

type ActionKey = "subtasks" | "priority" | "estimate" | "blockers" | "message";

export function TaskAiPanel({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [subtaskSuggestions, setSubtaskSuggestions] = useState<string[] | null>(null);
  const [priorityResult, setPriorityResult] = useState<{ priority: string; reason: string } | null>(null);
  const [estimateResult, setEstimateResult] = useState<{ estimatedMinutes: number; reason: string } | null>(null);
  const [blockersText, setBlockersText] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function run(key: ActionKey) {
    setLoading(key);
    try {
      if (key === "subtasks") setSubtaskSuggestions(await suggestSubtasksAction(taskId));
      if (key === "priority") setPriorityResult((await suggestPriorityAction(taskId)) as never);
      if (key === "estimate") setEstimateResult(await suggestEstimateAction(taskId));
      if (key === "blockers") setBlockersText(await explainBlockersAction(taskId));
      if (key === "message") setMessageText(await draftMessageAction(taskId));
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" /> AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="xs" disabled={!!loading} onClick={() => run("subtasks")}>
            {loading === "subtasks" ? <Loader2 className="size-3 animate-spin" /> : <ListChecks className="size-3" />}
            Break into subtasks
          </Button>
          <Button variant="outline" size="xs" disabled={!!loading} onClick={() => run("estimate")}>
            {loading === "estimate" ? <Loader2 className="size-3 animate-spin" /> : <Clock className="size-3" />}
            Estimate duration
          </Button>
          <Button variant="outline" size="xs" disabled={!!loading} onClick={() => run("priority")}>
            {loading === "priority" ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            Suggest priority
          </Button>
          <Button variant="outline" size="xs" disabled={!!loading} onClick={() => run("blockers")}>
            {loading === "blockers" ? <Loader2 className="size-3 animate-spin" /> : <AlertCircle className="size-3" />}
            Explain blockers
          </Button>
          <Button variant="outline" size="xs" disabled={!!loading} onClick={() => run("message")}>
            {loading === "message" ? <Loader2 className="size-3 animate-spin" /> : <Mail className="size-3" />}
            Draft message
          </Button>
        </div>

        {subtaskSuggestions && (
          <div className="rounded-lg border border-dashed p-2.5">
            <p className="mb-1.5 text-xs font-medium">Suggested subtasks</p>
            <ul className="mb-2 flex flex-col gap-1 text-xs text-muted-foreground">
              {subtaskSuggestions.map((s, i) => (
                <li key={i}>- {s}</li>
              ))}
            </ul>
            <Button
              size="xs"
              onClick={() =>
                startTransition(async () => {
                  await applySuggestedSubtasksAction(taskId, subtaskSuggestions);
                  setSubtaskSuggestions(null);
                  router.refresh();
                })
              }
            >
              Add all
            </Button>
          </div>
        )}

        {estimateResult && (
          <div className="rounded-lg border border-dashed p-2.5 text-xs">
            <p className="text-muted-foreground">
              AI estimates <span className="font-medium text-foreground">{estimateResult.estimatedMinutes} min</span> - {estimateResult.reason}
            </p>
            <Button
              size="xs"
              variant="outline"
              className="mt-1.5"
              onClick={() =>
                startTransition(async () => {
                  await updateTaskAction(taskId, { estimatedMinutes: estimateResult.estimatedMinutes });
                  setEstimateResult(null);
                  router.refresh();
                })
              }
            >
              Apply
            </Button>
          </div>
        )}

        {priorityResult && (
          <div className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
            AI suggests{" "}
            <span
              className="font-medium"
              style={{ color: PRIORITY_META[priorityResult.priority as keyof typeof PRIORITY_META].color }}
            >
              {PRIORITY_META[priorityResult.priority as keyof typeof PRIORITY_META].label}
            </span>{" "}
            - {priorityResult.reason}
          </div>
        )}

        {blockersText && <div className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">{blockersText}</div>}

        {messageText && (
          <div className="rounded-lg border border-dashed p-2.5 text-xs whitespace-pre-wrap text-muted-foreground">
            {messageText}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
