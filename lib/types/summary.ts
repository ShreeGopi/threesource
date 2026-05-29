import type { TaskStatus } from "@/lib/types/database";

export type SummaryTask = {
  id: string;
  title: string;
  status: TaskStatus;
  updated_at: string;
};

export type SummaryWorkedTask = {
  id: string;
  title: string;
  status: TaskStatus;
  time_tracked_seconds: number;
};

export type SummaryActiveLog = {
  id: string;
  task_id: string;
  started_at: string;
  elapsed_seconds: number;
  task: {
    id: string;
    title: string;
    status: TaskStatus;
  } | null;
};

export type DailySummary = {
  date: string;
  range: {
    start: string;
    end: string;
  };
  total_tracked_seconds: number;
  tasks_worked_on: SummaryWorkedTask[];
  completed_tasks: SummaryTask[];
  pending_tasks: SummaryTask[];
  in_progress_tasks: SummaryTask[];
  active_log: SummaryActiveLog | null;
};
