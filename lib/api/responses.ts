import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export function validationError(error: ZodError) {
  return apiError(
    400,
    "Validation failed.",
    error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  );
}

export async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
