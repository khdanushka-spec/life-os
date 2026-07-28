import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createTaskAction, deleteTaskAction } from "@/server/actions/tasks";
import { Priority } from "@/generated/prisma/client";

// Deletion needs to identify a task from freeform text (the model has no
// task IDs unless it copies one verbatim from the pending-tasks list in the
// system prompt). Matching by title keeps this safe: an unambiguous match
// deletes immediately (Dhanu asked for "auto delete", no confirmation
// step), but an ambiguous or empty match returns candidates/nothing instead
// of guessing which task she meant.
async function findTasksByTitle(userId: string, title: string) {
  return prisma.task.findMany({
    where: { userId, archived: false, title: { contains: title, mode: "insensitive" } },
    select: { id: true, title: true, dueDate: true },
    take: 10,
  });
}

export function buildChatTools(userId: string): ToolSet {
  return {
    addTask: tool({
      description:
        "Create a new task for the user. Use whenever they ask you to add, create, or remind them of a task/to-do - e.g. 'add a task to call the plumber tomorrow'. Resolve any relative date ('tomorrow', 'next Friday') yourself using the current date given in your instructions before calling this tool.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(280).describe("The task title, concise and in the user's own words."),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Due date as YYYY-MM-DD, resolved from any relative date the user mentioned. Omit if no date was implied."),
        priority: z
          .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "SOMEDAY_PRIORITY"])
          .optional()
          .describe("Only set this if the user's wording clearly implies urgency or low importance - otherwise omit and the default (MEDIUM) is used."),
        projectName: z
          .string()
          .optional()
          .describe("Name of an existing project to file this task under, if the user mentioned one. Match it against the user's project list in your instructions."),
        tags: z
          .array(z.string().trim().min(1).max(40))
          .max(10)
          .optional()
          .describe("Short freeform tags if the user's phrasing implies a category, e.g. 'groceries' or 'urgent'."),
      }),
      execute: async ({ title, dueDate, priority, projectName, tags }) => {
        let projectId: string | null = null;
        let projectNote: string | null = null;
        if (projectName) {
          const match = await prisma.project.findFirst({
            where: { userId, archived: false, name: { contains: projectName, mode: "insensitive" } },
            select: { id: true, name: true },
          });
          if (match) {
            projectId = match.id;
          } else {
            projectNote = `No project matching "${projectName}" was found, so it wasn't filed under a project.`;
          }
        }

        const created = await createTaskAction({
          title,
          dueDate: dueDate ?? null,
          priority: priority as Priority | undefined,
          projectId,
          tags,
        });

        if (!created) {
          return { success: false as const, reason: "The task could not be created (invalid input)." };
        }
        return {
          success: true as const,
          taskId: created.id,
          title,
          dueDate: dueDate ?? null,
          projectNote,
        };
      },
    }),

    deleteTask: tool({
      description:
        "Delete a task by matching its title. Use whenever the user asks you to delete, remove, or cancel a task. If more than one task matches, this returns the candidates instead of deleting anything - ask the user which one they mean rather than guessing.",
      inputSchema: z.object({
        title: z.string().trim().min(1).describe("The task title, or a distinctive substring of it, as the user referred to it."),
      }),
      execute: async ({ title }) => {
        const matches = await findTasksByTitle(userId, title);
        if (matches.length === 0) {
          return { success: false as const, reason: `No task matching "${title}" was found.` };
        }
        if (matches.length > 1) {
          return {
            success: false as const,
            reason: "More than one task matches - ask the user which one they mean.",
            candidates: matches.map((m) => ({
              title: m.title,
              dueDate: m.dueDate ? m.dueDate.toISOString().slice(0, 10) : null,
            })),
          };
        }
        await deleteTaskAction(matches[0].id);
        return { success: true as const, deletedTitle: matches[0].title };
      },
    }),
  };
}
