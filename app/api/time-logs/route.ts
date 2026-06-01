import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError, validationError } from "@/lib/api/responses";
import { TimeLogsQuerySchema } from "@/lib/validations/time-logs";

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = TimeLogsQuerySchema.safeParse({
    task_id: searchParams.get("task_id") ?? undefined,
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let query = supabase
    .from("time_logs")
    .select("*, tasks(title, status)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (parsed.data.task_id) {
    query = query.eq("task_id", parsed.data.task_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET /api/time-logs failed", error);
    return apiError(500, "Unable to load time logs.");
  }

  return NextResponse.json({ time_logs: data ?? [] });
}
