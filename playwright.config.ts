import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://main.yleis.co";

export default defineConfig({
  testDir: "./tests/e2e",
  // Varios tests comparten las mismas 2 cuentas de prueba y mutan sus filas en
  // Supabase (onboarding_step, bookings pendientes, etc.) — correr en paralelo
  // genera carreras entre archivos de test. Con esta suite chica, serie es más
  // simple y confiable que separar fixtures por cuenta.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
    },
  ],
});
