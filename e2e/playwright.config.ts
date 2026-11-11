import { defineConfig, devices } from '@playwright/test'

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:4200'

// Requiere datos de demo (`npm run seed`). Si la API o web-admin ya están arrancados se reutilizan.
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  outputDir: '../test-results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: ADMIN_URL,
    viewport: { width: 1100, height: 900 },
    trace: 'off'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 900 } } }],
  webServer: [
    {
      command: 'npm run dev:api',
      cwd: '..',
      url: 'http://localhost:3000/api/v1/public/restaurants',
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command: 'npm run dev:admin',
      cwd: '..',
      url: ADMIN_URL,
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
})
