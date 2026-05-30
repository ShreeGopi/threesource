import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const hasE2eCredentials = Boolean(
  process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD,
);
const shouldStartLocalServer =
  !process.env.PLAYWRIGHT_BASE_URL && hasE2eCredentials;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: shouldStartLocalServer
    ? {
        command: "npm run dev -- --hostname localhost --port 3000",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
