import type { ProjectStatus } from "@/generated/prisma/client";

export type ClientOption = {
  id: string;
  name: string;
  company: string | null;
};

export type ProjectWithStats = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  status: ProjectStatus;
  deadline: Date | null;
  budget: number | null;
  client: ClientOption | null;
  taskCount: number;
  doneTaskCount: number;
  progress: number;
};
