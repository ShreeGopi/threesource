import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError } from "@/lib/api/responses";
import { getOwnedTask } from "@/lib/api/tasks";
import { TaskIdSchema } from "@/lib/validations/tasks";

type TaskLogsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getTaskId(context: TaskLogsRouteContext) {
  const { id } = await context.params;
  const parsed = TaskIdSchema.safeParse(id);

  return parsed.success ? parsed.data : null;
}

export async function GET(
  _request: NextRequest,
  context: TaskLogsRouteContext,
) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const taskId = await getTaskId(context);

  if (!taskId) {
    return apiError(404, "Task not found.");
  }

  const { task, error: taskError } = await getOwnedTask(
    supabase,
    taskId,
    user.id,
  );

  if (taskError) {
    return apiError(500, "Unable to load task.");
  }

  if (!task) {
    return apiError(404, "Task not found.");
  }

  const { data, error } = await supabase
    .from("time_logs")
    .select("*, tasks(title, status)")
    .eq("user_id", user.id)
    .eq("task_id", task.id)
    .order("started_at", { ascending: false });

  if (error) {
    return apiError(500, "Unable to load task time logs.");
  }

  return NextResponse.json({ time_logs: data ?? [] });
}
