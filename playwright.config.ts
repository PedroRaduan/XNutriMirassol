import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/xnutri_test?schema=public";

// Keep both the Playwright workers and the Next.js test server on the isolated
// database. TEST_DATABASE_URL is the only supported override for this suite.
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = testDatabaseUrl;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: `${baseURL}/api/health`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: testDatabaseUrl,
      NEXT_PUBLIC_APP_URL: baseURL,
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      AUTH_SECRET: "xnutri-e2e-only-secret-with-at-least-32-characters",
      AUTH_TRUST_HOST: "true",
      GOOGLE_CLIENT_ID: "xnutri-e2e-google-client-id",
      GOOGLE_CLIENT_SECRET: "xnutri-e2e-google-client-secret",
      XNUTRI_DEPLOYMENT: "local",
      NEXT_DIST_DIR: ".next-e2e",
      ALLOW_DEMO_DATA: "false",
      RATE_LIMIT_DISABLED: "true",
      PAGBANK_ENVIRONMENT: "sandbox",
      PAGBANK_TOKEN: "",
      PAGBANK_WEBHOOK_TOKEN: "",
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "tablet-chromium",
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 810, height: 1080 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
