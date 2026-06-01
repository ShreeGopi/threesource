import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError, parseJsonBody, validationError } from "@/lib/api/responses";
import { CreateTaskSchema } from "@/lib/validations/tasks";

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/tasks failed", error);
    return apiError(500, "Unable to load tasks.");
  }

  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const body = await parseJsonBody(request);

  if (!body) {
    return apiError(400, "Request body must be valid JSON.");
  }

  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const originalInput = parsed.data.original_input;
  const title = parsed.data.title ?? originalInput.trim();
  const description = parsed.data.description ?? null;
  const status = parsed.data.status ?? "pending";

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title,
      description,
      original_input: originalInput,
      status,
    })
    .select("*")
    .single();

  if (error) {
    console.error("POST /api/tasks failed", error);
    return apiError(500, "Unable to create task.");
  }

  return NextResponse.json({ task: data }, { status: 201 });
}
