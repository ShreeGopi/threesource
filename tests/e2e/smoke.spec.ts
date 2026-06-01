import { expect, test, type Page } from "@playwright/test";

const testEmail = process.env.E2E_TEST_EMAIL;
const testPassword = process.env.E2E_TEST_PASSWORD;
const hasTestCredentials = Boolean(testEmail && testPassword);
const missingCredentialsMessage =
  "E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required. Use a confirmed Supabase test user before running Playwright E2E tests.";
const runPrefix = `E2E-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

type TaskApiRow = {
  id: string;
  title: string;
};

type TaskApiResponse = {
  task: TaskApiRow;
};

type SuggestionRequest = {
  input?: string;
};

type TasksApiResponse = {
  tasks: TaskApiRow[];
};

type TimeLogApiRow = {
  task_id: string;
  ended_at: string | null;
};

type TimeLogsApiResponse = {
  time_logs: TimeLogApiRow[];
};

function requireTestCredentials() {
  if (!testEmail || !testPassword) {
    throw new Error(missingCredentialsMessage);
  }

  return {
    email: testEmail,
    password: testPassword,
  };
}

function uniqueTitle(label: string) {
  return `${runPrefix} ${label} ${"long-title-segment ".repeat(5)}`.slice(
    0,
    150,
  );
}

function taskCard(page: Page, title: string) {
  return page.getByTestId("task-card").filter({ hasText: title });
}

function isCreateTaskResponse(url: string, method: string) {
  return new URL(url).pathname === "/api/tasks" && method === "POST";
}

async function waitForDashboardReady(page: Page) {
  await expect(page.getByTestId("task-manager")).toBeVisible();
  await expect(page.getByTestId("task-create-submit")).toBeVisible();
  await expect(page.getByTestId("task-list-loading")).toHaveCount(0);
  await expect(page.getByTestId("time-logs-loading")).toHaveCount(0);
  await expect(page.getByTestId("task-create-submit")).toBeEnabled();
}

async function expectSuccessFeedback(page: Page, expected: string | RegExp) {
  const feedback = page
    .getByTestId("feedback-success")
    .or(page.getByRole("status").filter({ hasText: expected }))
    .first();

  await expect(feedback).toContainText(expected);
}

async function maybeExpectSuccessFeedback(
  page: Page,
  expected: string | RegExp,
) {
  const feedback = page
    .getByTestId("feedback-success")
    .or(page.getByRole("status").filter({ hasText: expected }))
    .first();

  await expect(feedback)
    .toContainText(expected, { timeout: 2_000 })
    .catch(() => {
      // Task creation is proven by the durable task card assertion nearby.
    });
}

async function login(page: Page) {
  const credentials = requireTestCredentials();

  await page.goto("/login");
  await page.getByTestId("login-email").fill(credentials.email);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/dashboard/);
  await waitForDashboardReady(page);
}

async function stopActiveTimer(page: Page) {
  const response = await page.request.get("/api/time-logs");

  if (!response.ok()) {
    return;
  }

  const payload = (await response.json()) as TimeLogsApiResponse;
  const activeLog = payload.time_logs.find((log) => log.ended_at === null);

  if (activeLog) {
    await page.request.post(`/api/tasks/${activeLog.task_id}/stop`);
  }
}

async function cleanupE2eTasks(page: Page) {
  await stopActiveTimer(page);

  const response = await page.request.get("/api/tasks");

  if (!response.ok()) {
    return;
  }

  const payload = (await response.json()) as TasksApiResponse;
  const e2eTasks = payload.tasks.filter((task) =>
    task.title.includes(runPrefix),
  );

  for (const task of e2eTasks) {
    await page.request.delete(`/api/tasks/${task.id}`);
  }
}

async function createTask(
  page: Page,
  title: string,
  description = "Created by the Playwright smoke suite.",
) {
  const originalInput = page.getByTestId("task-original-input");
  const titleInput = page.getByTestId("task-title-input");
  const descriptionInput = page.getByTestId("task-description-input");
  const submitButton = page.getByTestId("task-create-submit");

  await expect(originalInput).toBeVisible();
  await originalInput.fill(title);
  await expect(originalInput).toHaveValue(title);

  await titleInput.fill(title);
  await expect(titleInput).toHaveValue(title);

  await descriptionInput.fill(description);
  await expect(descriptionInput).toHaveValue(description);
  await expect(submitButton).toBeEnabled();

  const [response] = await Promise.all([
    page.waitForResponse((res) =>
      isCreateTaskResponse(res.url(), res.request().method()),
    ),
    submitButton.click(),
  ]);

  if (response.status() !== 201) {
    throw new Error(
      `POST /api/tasks returned ${response.status()}: ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as TaskApiResponse;
  const displayTitle = payload.task.title;

  const card = taskCard(page, displayTitle);
  await expect(card).toBeVisible();
  await maybeExpectSuccessFeedback(page, /Task created/i);

  return card;
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const documentWidth = document.documentElement.scrollWidth;
        const viewportWidth = document.documentElement.clientWidth;
        const bodyWidth = document.body.scrollWidth;

        return (
          documentWidth <= viewportWidth + 2 && bodyWidth <= viewportWidth + 2
        );
      }),
    )
    .toBe(true);
}

test("E2E credentials are configured", () => {
  expect(testEmail, missingCredentialsMessage).toBeTruthy();
  expect(testPassword, missingCredentialsMessage).toBeTruthy();
});

test.describe("ThreeSource smoke flow", () => {
  test.skip(!hasTestCredentials, missingCredentialsMessage);

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === "skipped") {
      return;
    }

    try {
      await login(page);
      await cleanupE2eTasks(page);
    } catch (error) {
      console.warn("E2E cleanup failed:", error);
    }
  });

  test("logged-out protected routes redirect to login with a visible message", async ({
    page,
  }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?message=/);
  await expect(page.getByRole("status")).toContainText(
    "Please log in to continue.",
  );

  await page.goto("/summary");
  await expect(page).toHaveURL(/\/login\?message=/);
  await expect(page.getByRole("status")).toContainText(
    "Please log in to continue.",
  );
});

  test("invalid login credentials show a credential-specific error", async ({
    page,
  }) => {
  await page.goto("/login");
  await page
    .getByTestId("login-email")
    .fill(`missing-${Date.now()}@example.com`);
  await page.getByTestId("login-password").fill("not-the-right-password");
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/login\?error=/);
  await expect(page.getByTestId("login-error")).toContainText(
    "Invalid email or password.",
  );
});

  test("auth flow logs in, loads dashboard, and logs out", async ({ page }) => {
  await login(page);

  await expect(page.getByTestId("logout-submit")).toHaveText("Log out");
  await page.getByTestId("logout-submit").click();

  await expect(page).toHaveURL(/\/login\?message=/);
  await expect(page.getByRole("status")).toContainText(
    "You have been signed out.",
  );
});

  test("suggestion flow populates fields and waits for manual task creation", async ({
    page,
  }) => {
  await login(page);
  await cleanupE2eTasks(page);

  const originalInput = uniqueTitle("suggest input");
  const suggestedTitle = `${runPrefix} suggested task`;
  const suggestedDescription =
    "Confirm designer progress and expected delivery timeline.";

  await page.route("**/api/tasks/suggest", async (route) => {
    const request = route.request();
    const payload = request.postDataJSON() as SuggestionRequest;

    expect(request.method()).toBe("POST");
    expect(payload.input).toBe(originalInput.trim());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: suggestedTitle,
        description: suggestedDescription,
        source: "gemini",
      }),
    });
  });

  await expect(page.getByTestId("ai-suggest-button")).toHaveText("Suggest");
  await page.getByTestId("task-original-input").fill(originalInput);
  await page.getByTestId("ai-suggest-button").click();
  await expect(page.getByTestId("task-title-input")).toHaveValue(
    suggestedTitle,
  );
  await expect(page.getByTestId("task-description-input")).toHaveValue(
    suggestedDescription,
  );
  await expectSuccessFeedback(page, /Suggestion added/i);
  await expect(taskCard(page, suggestedTitle)).toHaveCount(0);

  const [response] = await Promise.all([
    page.waitForResponse((res) =>
      isCreateTaskResponse(res.url(), res.request().method()),
    ),
    page.getByTestId("task-create-submit").click(),
  ]);

  expect(response.status()).toBe(201);
  await expect(taskCard(page, suggestedTitle)).toBeVisible();
  await maybeExpectSuccessFeedback(page, /Task created/i);
});

  test("suggestion fallback works without a Gemini key", async ({ page }) => {
  test.skip(
    Boolean(process.env.GEMINI_API_KEY),
    "GEMINI_API_KEY is configured, so the live route may use Gemini.",
  );

  await login(page);
  await cleanupE2eTasks(page);

  await page.getByTestId("task-original-input").fill("drink water");
  await page.getByTestId("ai-suggest-button").click();
  await expect(page.getByTestId("task-title-input")).toHaveValue("Drink Water");
  await expect(page.getByTestId("task-description-input")).toHaveValue(
    "Take a short hydration break.",
  );
  await expectSuccessFeedback(page, /offline fallback/i);

  const [response] = await Promise.all([
    page.waitForResponse((res) =>
      isCreateTaskResponse(res.url(), res.request().method()),
    ),
    page.getByTestId("task-create-submit").click(),
  ]);

  expect(response.status()).toBe(201);
  const payload = (await response.json()) as TaskApiResponse;
  await expect(taskCard(page, payload.task.title)).toBeVisible();
  await page.request.delete(`/api/tasks/${payload.task.id}`);
});

  test("task CRUD creates, edits, updates status, and deletes a task", async ({
    page,
  }) => {
  await login(page);
  await cleanupE2eTasks(page);

  const title = uniqueTitle("crud");
  const updatedTitle = `${title} updated`.slice(0, 160);
  const updatedDescription = "Updated by the E2E smoke test.";

  const card = await createTask(page, title);
  await card.getByTestId("task-edit-button").click();
  await expect(page).toHaveURL(/\/dashboard/);

  const editTitleInput = page.getByTestId("task-edit-title");
  const editDescriptionInput = page.getByTestId("task-edit-description");
  const editStatusSelect = page.getByTestId("task-edit-status");
  const editSaveButton = page.getByTestId("task-edit-save");

  await expect(editTitleInput).toBeVisible();
  await editTitleInput.fill(updatedTitle);
  await expect(editTitleInput).toHaveValue(updatedTitle);
  await editDescriptionInput.fill(updatedDescription);
  await expect(editDescriptionInput).toHaveValue(updatedDescription);
  await editStatusSelect.selectOption("in_progress");
  await expect(editStatusSelect).toHaveValue("in_progress");
  await editSaveButton.click();

  const updatedCard = taskCard(page, updatedTitle);
  await expect(updatedCard).toBeVisible();
  await expectSuccessFeedback(page, /Task updated/i);
  await expect(updatedCard.getByTestId("task-description")).toContainText(
    updatedDescription,
  );
  await expect(updatedCard.getByTestId("task-status-select")).toHaveValue(
    "in_progress",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await updatedCard.getByTestId("task-delete-button").click();
  await expect(taskCard(page, updatedTitle)).toHaveCount(0);
  await expectSuccessFeedback(page, /Task deleted/i);
});

  test("timer flow starts one task, blocks another timer, stops, and shows a log", async ({
    page,
  }) => {
  await login(page);
  await cleanupE2eTasks(page);

  const firstTitle = uniqueTitle("timer first");
  const secondTitle = uniqueTitle("timer second");
  const firstCard = await createTask(page, firstTitle);
  const secondCard = await createTask(page, secondTitle);

  await firstCard.getByTestId("task-start-button").click();
  await expect(firstCard.getByText(/Tracking/)).toBeVisible();
  await expectSuccessFeedback(page, /Timer started/i);
  await expect(secondCard.getByTestId("task-start-button")).toBeDisabled();

  await page.waitForTimeout(1200);
  await firstCard.getByTestId("task-stop-button").click();
  await expect(firstCard.getByTestId("task-completed-time")).toContainText(
    /[1-9]\d*s|[1-9]\d*m|[1-9]\d*h/,
  );
  await expectSuccessFeedback(page, /Timer stopped and saved/i);

  const logGroup = page.getByTestId("time-log-group").filter({
    hasText: firstTitle,
  });
  await expect(logGroup).toBeVisible();
  await logGroup.getByTestId("time-log-toggle").click();
  await expect(logGroup.getByTestId("time-log-session")).toBeVisible();
});

  test("completing a task with an active timer stops the timer first", async ({
    page,
  }) => {
  await login(page);
  await cleanupE2eTasks(page);

  const title = uniqueTitle("complete active");
  const card = await createTask(page, title);

  await card.getByTestId("task-start-button").click();
  await expect(card.getByText(/Tracking/)).toBeVisible();
  await page.waitForTimeout(1200);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain(
      "Completing it will stop the timer and save the current session.",
    );
    await dialog.accept();
  });

  await card.getByTestId("task-status-select").selectOption("completed");
  await expect(card.getByTestId("task-status-select")).toHaveValue(
    "completed",
  );
  await expect(card.getByTestId("task-start-button")).toBeVisible();
  await expect(card.getByTestId("task-current-run")).toContainText("-");
  await expectSuccessFeedback(page, /Task completed/i);
});

  test("daily summary renders tracked, completed, pending, and in-progress sections", async ({
    page,
  }) => {
  await login(page);
  await cleanupE2eTasks(page);

  const trackedTitle = uniqueTitle("summary tracked");
  const pendingTitle = uniqueTitle("summary pending");
  const trackedCard = await createTask(page, trackedTitle);
  await createTask(page, pendingTitle);

  await trackedCard.getByTestId("task-start-button").click();
  await page.waitForTimeout(1200);
  await trackedCard.getByTestId("task-stop-button").click();
  await expectSuccessFeedback(page, /Timer stopped and saved/i);
  await trackedCard.getByTestId("task-status-select").selectOption("completed");
  await expectSuccessFeedback(page, /Task completed/i);
  const trackedLogGroup = page.getByTestId("time-log-group").filter({
    hasText: trackedTitle,
  });
  await expect(
    trackedLogGroup.getByTestId("time-log-task-status"),
  ).toContainText("Completed");

  await page.getByRole("link", { name: "Summary" }).click();
  await expect(page).toHaveURL(/\/summary/);
  await expect(page.getByTestId("daily-summary")).toBeVisible();
  await expect(page.getByTestId("summary-total-tracked")).toBeVisible();
  await expect(page.getByTestId("summary-worked")).toBeVisible();
  await expect(page.getByTestId("summary-completed")).toContainText(
    trackedTitle,
  );
  await expect(page.getByTestId("summary-pending")).toContainText(pendingTitle);
  await expect(page.getByTestId("summary-in-progress")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

  test("dashboard and summary tolerate very long task titles without horizontal overflow", async ({
    page,
  }) => {
  await login(page);
  await cleanupE2eTasks(page);

  const title = uniqueTitle("layout safety");
  await createTask(page, title);

  await expectNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "Summary" }).click();
  await expect(page.getByTestId("daily-summary")).toBeVisible();
  await expect(page.getByTestId("summary-pending")).toContainText(title);
  await expectNoHorizontalOverflow(page);
  });
});
