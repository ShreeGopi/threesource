import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError, parseJsonBody, validationError } from "@/lib/api/responses";
import { SuggestTaskSchema } from "@/lib/validations/tasks";
import {
  generateTaskSuggestion,
  TASK_SUGGESTION_HARD_FAILURE_MESSAGE,
} from "@/src/lib/ai/task-suggestions";

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();

  if (!user) {
    return apiError(401, "Authentication required.");
  }

  const body = await parseJsonBody(request);

  if (!body) {
    return apiError(400, "Request body must be valid JSON.");
  }

  const parsed = SuggestTaskSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const suggestion = await generateTaskSuggestion(parsed.data.input);

    return NextResponse.json(suggestion);
  } catch {
    return apiError(503, TASK_SUGGESTION_HARD_FAILURE_MESSAGE);
  }
}
