import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError } from "@/lib/api/responses";
import { getOwnedTask } from "@/lib/api/tasks";
import { TaskIdSchema } from "@/lib/validations/tasks";

type StartRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getTaskId(context: StartRouteContext) {
  const { id } = await context.params;
  const parsed = TaskIdSchema.safeParse(id);

  return parsed.success ? parsed.data : null;
}

async function getActiveLog(
  supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"],
  userId: string,
) {
  return supabase
    .from("time_logs")
    .select("*, tasks(title)")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();
}

export async function POST(_request: NextRequest, context: StartRouteContext) {
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

  const { data: activeLog, error: activeLogError } = await getActiveLog(
    supabase,
    user.id,
  );

  if (activeLogError) {
    return apiError(500, "Unable to check active timer.");
  }

  if (activeLog) {
    return apiError(409, "Another task is already being tracked.", {
      active_log: activeLog,
    });
  }

  const { data: createdLog, error: createError } = await supabase
    .from("time_logs")
    .insert({
      user_id: user.id,
      task_id: task.id,
    })
    .select("*, tasks(title)")
    .single();

  if (createError) {
    if (createError.code === "23505") {
      const { data: conflictingLog } = await getActiveLog(supabase, user.id);

      return apiError(409, "Another task is already being tracked.", {
        active_log: conflictingLog,
      });
    }

    return apiError(500, "Unable to start timer.");
  }

  if (task.status === "pending") {
    await supabase
      .from("tasks")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ time_log: createdLog }, { status: 201 });
}
