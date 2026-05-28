import { NextResponse, type NextRequest } from "next/server";
import type { TaskUpdate } from "@/lib/types/database";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError, parseJsonBody, validationError } from "@/lib/api/responses";
import { TaskIdSchema, UpdateTaskSchema } from "@/lib/validations/tasks";

type TaskRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const notFoundResponse = () => apiError(404, "Task not found.");

async function getTaskId(context: TaskRouteContext) {
  const { id } = await context.params;
  const parsed = TaskIdSchema.safeParse(id);

  return parsed.success ? parsed.data : null;
}

export async function GET(_request: NextRequest, context: TaskRouteContext) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const id = await getTaskId(context);

  if (!id) {
    return notFoundResponse();
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return apiError(500, "Unable to load task.");
  }

  if (!data) {
    return notFoundResponse();
  }

  return NextResponse.json({ task: data });
}

export async function PATCH(request: NextRequest, context: TaskRouteContext) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const id = await getTaskId(context);

  if (!id) {
    return notFoundResponse();
  }

  const body = await parseJsonBody(request);

  if (!body) {
    return apiError(400, "Request body must be valid JSON.");
  }

  const parsed = UpdateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const updates: TaskUpdate = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return apiError(500, "Unable to update task.");
  }

  if (!data) {
    return notFoundResponse();
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(_request: NextRequest, context: TaskRouteContext) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const id = await getTaskId(context);

  if (!id) {
    return notFoundResponse();
  }

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return apiError(500, "Unable to delete task.");
  }

  if (!data) {
    return notFoundResponse();
  }

  return new Response(null, { status: 204 });
}
