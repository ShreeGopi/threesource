import { TaskSuggestionSchema } from "@/lib/validations/tasks";

export type TaskSuggestionSource = "gemini" | "fallback";

export type GeneratedTaskSuggestion = {
  title: string;
  description: string;
  source: TaskSuggestionSource;
};

export const TASK_SUGGESTION_SYSTEM_PROMPT = `You generate concise task titles and descriptions from rough natural language input.

Rules:
- Return JSON only.
- No markdown.
- No extra explanation.
- title <= 80 characters.
- description <= 200 characters.
- Professional and actionable.
- Do not invent specific people, dates, tools, or facts not in the input.
- If input is simple, keep suggestion simple.`;

export const TASK_SUGGESTION_HARD_FAILURE_MESSAGE =
  "Unable to generate suggestion right now. You can enter details manually.";
 
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const REQUEST_TIMEOUT_MS = 12_000;
const LOG_BODY_LIMIT = 500;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function cleanInput(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength - 1).trimEnd();
}

function fallbackDescription(cleanedInput: string) {
  const lowerInput = cleanedInput.toLowerCase();

  if (lowerInput === "drink water" || lowerInput.includes("drink water")) {
    return "Take a short hydration break.";
  }

  if (lowerInput.startsWith("follow up")) {
    return "Check in on progress and confirm the next step.";
  }

  if (
    lowerInput.startsWith("email ") ||
    lowerInput.startsWith("message ") ||
    lowerInput.startsWith("call ")
  ) {
    return "Reach out and confirm the next step.";
  }

  return "Review the task details and complete the next step.";
}

function generateFallbackSuggestion(input: string): GeneratedTaskSuggestion {
  const cleanedInput = cleanInput(input);
  const fallbackTitle = titleCase(cleanedInput) || "New Task";

  return {
    title: limitText(fallbackTitle, 80),
    description: limitText(fallbackDescription(cleanedInput), 200),
    source: "fallback",
  };
}

function parseGeminiText(text: string) {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
    const suggestion = TaskSuggestionSchema.safeParse(parsed);

    return suggestion.success ? suggestion.data : null;
  } catch {
    return null;
  }
}

async function generateWithGemini(
  input: string,
): Promise<GeneratedTaskSuggestion | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TASK_SUGGEST_MODEL || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    console.warn("Gemini task suggestion skipped: GEMINI_API_KEY is missing.");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: TASK_SUGGESTION_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Input: ${input}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 160,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      console.warn("Gemini task suggestion failed; using fallback.", {
        model,
        status: response.status,
        statusText: response.statusText,
        body: responseText.slice(0, LOG_BODY_LIMIT),
      });
      return null;
    }

    const payload = (await response.json()) as GeminiResponse;
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";
    const suggestion = parseGeminiText(text);

    if (!suggestion) {
      console.warn("Gemini task suggestion returned invalid JSON; using fallback.", {
        model,
        body: text.slice(0, LOG_BODY_LIMIT),
      });
    }

    return suggestion ? { ...suggestion, source: "gemini" } : null;
  } catch (caughtError) {
    console.warn("Gemini task suggestion request failed; using fallback.", {
      model,
      error:
        caughtError instanceof Error ? caughtError.message : "Unknown error",
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateTaskSuggestion(
  input: string,
): Promise<GeneratedTaskSuggestion> {
  const cleanedInput = cleanInput(input);
  const geminiSuggestion = await generateWithGemini(cleanedInput);

  if (geminiSuggestion) {
    console.log("Task suggestion source: gemini");
    return geminiSuggestion;
  }

  console.log("Task suggestion source: fallback");
  return generateFallbackSuggestion(cleanedInput);
}
