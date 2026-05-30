import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError } from "@/lib/api/responses";
import { getOwnedTask } from "@/lib/api/tasks";
import { TaskIdSchema } from "@/lib/validations/tasks";

type StopRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getTaskId(context: StopRouteContext) {
  const { id } = await context.params;
  const parsed = TaskIdSchema.safeParse(id);

  return parsed.success ? parsed.data : null;
}

export async function POST(_request: NextRequest, context: StopRouteContext) {
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

  const { data: activeLog, error: activeLogError } = await supabase
    .from("time_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("task_id", task.id)
    .is("ended_at", null)
    .maybeSingle();

  if (activeLogError) {
    return apiError(500, "Unable to load active timer.");
  }

  if (!activeLog) {
    return apiError(409, "This task does not have an active timer.");
  }

  const endedAt = new Date();
  const startedAt = new Date(activeLog.started_at);
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
  );

  const { data: completedLog, error: updateError } = await supabase
    .from("time_logs")
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", activeLog.id)
    .eq("user_id", user.id)
    .is("ended_at", null)
    .select("*, tasks(title, status)")
    .single();

  if (updateError) {
    return apiError(500, "Unable to stop timer.");
  }

  return NextResponse.json({ time_log: completedLog });
}
