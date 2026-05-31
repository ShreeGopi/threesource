import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { apiError, parseJsonBody, validationError } from "@/lib/api/responses";
import {
  SuggestTaskSchema,
  TaskSuggestionSchema,
} from "@/lib/validations/tasks";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 15_000;

type OpenAITextContent = {
  type?: string;
  text?: unknown;
};

type OpenAIOutputItem = {
  content?: OpenAITextContent[];
};

type OpenAIResponsePayload = {
  output_text?: unknown;
  output?: OpenAIOutputItem[];
};

function getOpenAIConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_TASK_SUGGEST_MODEL ?? DEFAULT_MODEL,
  };
}

function extractOutputText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (typeof content.text === "string" ? content.text : ""))
      .join("")
      .trim() ?? ""
  );
}

function buildSuggestionPrompt(naturalInput: string) {
  return [
    {
      role: "system",
      content:
        "You turn rough task notes into a clear task title and a short task description. Keep the title action-oriented. Keep the description specific but do not invent facts that are not implied by the user's text. Do not use markdown.",
    },
    {
      role: "user",
      content: `Natural task input: ${naturalInput}`,
    },
  ];
}

async function requestTaskSuggestion(naturalInput: string) {
  const { apiKey, model } = getOpenAIConfig();

  if (!apiKey) {
    throw new ApiSuggestionError(
      503,
      "AI suggestions are not configured yet.",
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: buildSuggestionPrompt(naturalInput),
        temperature: 0.2,
        max_output_tokens: 220,
        text: {
          format: {
            type: "json_schema",
            name: "task_suggestion",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: {
                  type: "string",
                  description:
                    "A short, clear, action-oriented task title. Maximum 80 characters when possible.",
                },
                description: {
                  type: "string",
                  description:
                    "A concise one-sentence task description based only on the user input.",
                },
              },
              required: ["title", "description"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new ApiSuggestionError(
        response.status === 401 ? 503 : 502,
        "Could not generate a suggestion right now. Please try again.",
      );
    }

    const payload = (await response.json()) as OpenAIResponsePayload;
    const outputText = extractOutputText(payload);

    if (!outputText) {
      throw new ApiSuggestionError(
        502,
        "Could not generate a suggestion right now. Please try again.",
      );
    }

    const parsedJson = JSON.parse(outputText) as unknown;
    const parsedSuggestion = TaskSuggestionSchema.safeParse(parsedJson);

    if (!parsedSuggestion.success) {
      throw new ApiSuggestionError(
        502,
        "Could not generate a suggestion right now. Please try again.",
      );
    }

    return parsedSuggestion.data;
  } catch (caughtError) {
    if (caughtError instanceof ApiSuggestionError) {
      throw caughtError;
    }

    throw new ApiSuggestionError(
      502,
      "Could not generate a suggestion right now. Please try again.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

class ApiSuggestionError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiSuggestionError";
  }
}

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
    const suggestion = await requestTaskSuggestion(parsed.data.natural_input);

    return NextResponse.json(suggestion);
  } catch (caughtError) {
    if (caughtError instanceof ApiSuggestionError) {
      return apiError(caughtError.status, caughtError.message);
    }

    return apiError(
      500,
      "Something went wrong while generating a suggestion.",
    );
  }
}
