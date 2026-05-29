import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError, validationError } from "@/lib/api/responses";
import { getLocalDayRange, getOverlappingSeconds } from "@/lib/summary";
import type { Task, TimeLog } from "@/lib/types/database";
import type {
  DailySummary,
  SummaryActiveLog,
  SummaryTask,
  SummaryWorkedTask,
} from "@/lib/types/summary";
import { SummaryTodayQuerySchema } from "@/lib/validations/summary";

type TimeLogSummaryRow = TimeLog & {
  tasks: Pick<Task, "id" | "title" | "status"> | null;
};

type SummaryTaskRow = Pick<Task, "id" | "title" | "status" | "updated_at">;

const toSummaryTask = (task: SummaryTaskRow): SummaryTask => ({
  id: task.id,
  title: task.title,
  status: task.status,
  updated_at: task.updated_at,
});

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const parsed = SummaryTodayQuerySchema.safeParse({
    timezone_offset_minutes:
      request.nextUrl.searchParams.get("timezone_offset_minutes") ?? undefined,
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const range = getLocalDayRange(parsed.data.timezone_offset_minutes);

  const [logsResult, tasksResult] = await Promise.all([
    supabase
      .from("time_logs")
      .select("*, tasks(id,title,status)")
      .eq("user_id", user.id)
      .lt("started_at", range.endUtcIso)
      .or(`ended_at.is.null,ended_at.gte.${range.startUtcIso}`)
      .order("started_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id,title,status,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (logsResult.error) {
    return apiError(500, "Unable to load today's time logs.");
  }

  if (tasksResult.error) {
    return apiError(500, "Unable to load today's tasks.");
  }

  const timeLogs = (logsResult.data ?? []) as TimeLogSummaryRow[];
  const tasks = (tasksResult.data ?? []) as SummaryTaskRow[];
  const trackedSecondsByTask = new Map<
    string,
    { task: Pick<Task, "id" | "title" | "status"> | null; seconds: number }
  >();

  let totalTrackedSeconds = 0;
  let activeLog: SummaryActiveLog | null = null;

  timeLogs.forEach((log) => {
    const seconds = getOverlappingSeconds({
      startedAt: log.started_at,
      endedAt: log.ended_at,
      nowUtcMs: range.nowUtcMs,
      startUtcMs: range.startUtcMs,
      endUtcMs: range.endUtcMs,
    });

    totalTrackedSeconds += seconds;

    if (seconds > 0) {
      const existing = trackedSecondsByTask.get(log.task_id);
      trackedSecondsByTask.set(log.task_id, {
        task: log.tasks,
        seconds: (existing?.seconds ?? 0) + seconds,
      });
    }

    if (!log.ended_at) {
      activeLog = {
        id: log.id,
        task_id: log.task_id,
        started_at: log.started_at,
        elapsed_seconds: getOverlappingSeconds({
          startedAt: log.started_at,
          endedAt: null,
          nowUtcMs: range.nowUtcMs,
          startUtcMs: range.startUtcMs,
          endUtcMs: range.endUtcMs,
        }),
        task: log.tasks,
      };
    }
  });

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const tasksWorkedOn: SummaryWorkedTask[] = [];

  trackedSecondsByTask.forEach((value, taskId) => {
    const task = tasksById.get(taskId) ?? value.task;

    if (!task || task.status === "completed") {
      return;
    }

    tasksWorkedOn.push({
      id: task.id,
      title: task.title,
      status: task.status,
      time_tracked_seconds: value.seconds,
    });
  });

  tasksWorkedOn.sort(
    (a, b) => b.time_tracked_seconds - a.time_tracked_seconds,
  );

  const completedTasks = tasks
    .filter((task) => {
      const updatedAtMs = new Date(task.updated_at).getTime();

      return (
        task.status === "completed" &&
        updatedAtMs >= range.startUtcMs &&
        updatedAtMs < range.endUtcMs
      );
    })
    .map(toSummaryTask);

  const pendingTasks = tasks
    .filter((task) => task.status === "pending")
    .map(toSummaryTask);

  const inProgressTasks = tasks
    .filter((task) => task.status === "in_progress")
    .map(toSummaryTask);

  const summary: DailySummary = {
    date: range.date,
    range: {
      start: range.startUtcIso,
      end: range.endUtcIso,
    },
    total_tracked_seconds: totalTrackedSeconds,
    tasks_worked_on: tasksWorkedOn,
    completed_tasks: completedTasks,
    pending_tasks: pendingTasks,
    in_progress_tasks: inProgressTasks,
    active_log: activeLog,
  };

  return NextResponse.json({ summary });
}
