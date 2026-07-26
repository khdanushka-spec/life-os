"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createProjectAction, updateProjectAction } from "@/server/actions/tasks";
import { createClientAction } from "@/server/actions/work";
import { PROJECT_COLOR_OPTIONS, PROJECT_STATUS_META } from "@/lib/work";
import type { ClientOption, ProjectWithStats } from "@/components/work/types";
import type { ProjectStatus } from "@/generated/prisma/client";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function ProjectFormBody({
  onOpenChange,
  mode,
  project,
  clients,
}: {
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  project?: ProjectWithStats;
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? PROJECT_COLOR_OPTIONS[0]);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "ACTIVE");
  const [deadline, setDeadline] = useState(toDateInputValue(project?.deadline ?? null));
  const [budget, setBudget] = useState(project?.budget?.toString() ?? "");
  const [clientId, setClientId] = useState(project?.client?.id ?? "");
  const [localClients, setLocalClients] = useState(clients);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  async function handleAddClient() {
    if (!newClientName.trim()) return;
    const result = await createClientAction({ name: newClientName.trim() });
    if (result.error || !result.client) {
      setError(result.error ?? "Couldn't create client.");
      return;
    }
    setLocalClients((prev) => [...prev, { id: result.client!.id, name: result.client!.name, company: result.client!.company }]);
    setClientId(result.client.id);
    setAddingClient(false);
    setNewClientName("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);

    const payload = {
      name: name.trim(),
      color,
      kind: "WORK" as const,
      description: description.trim() || null,
      status,
      deadline: deadline || null,
      budget: budget ? Number(budget) : null,
      clientId: clientId || null,
    };

    startTransition(async () => {
      const result =
        mode === "edit" && project ? await updateProjectAction(project.id, payload) : await createProjectAction(payload);

      if (!result) {
        setError("Something went wrong. Please try again.");
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit project" : "New project"}</DialogTitle>
        <DialogDescription>Projects, clients, and deadlines for your work.</DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project-name">Name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website Redesign"
            maxLength={80}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details about this project"
            maxLength={2000}
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn(
                  "size-7 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                  color === c && "ring-2 ring-foreground",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Client</Label>
          {!addingClient ? (
            <div className="flex gap-2">
              <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : (v as string))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {localClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` (${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setAddingClient(true)}>
                New
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client name"
                maxLength={120}
              />
              <Button type="button" size="sm" onClick={handleAddClient}>
                Add
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAddingClient(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROJECT_STATUS_META) as ProjectStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="project-deadline">Deadline</Label>
            <Input id="project-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project-budget">Budget (AUD)</Label>
          <Input
            id="project-budget"
            type="number"
            min={0}
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create project"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ProjectFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  project?: ProjectWithStats;
  clients: ClientOption[];
}) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <ProjectFormBody {...props} />}</DialogContent>
    </Dialog>
  );
}
