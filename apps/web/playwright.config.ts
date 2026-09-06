import { defineConfig } from '@playwright/test'

// Playwright's automatic failure DOM dump includes password input values.
// Keep generated credentials out of error-context.md as well as traces.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'

const configuredUrl = process.env.FWX_E2E_BASE_URL
if (!configuredUrl) {
  throw new Error('Set FWX_E2E_BASE_URL to the running local Web app connected to an isolated test API/database.')
}

const baseUrl = new URL(configuredUrl)
if (!['http:', 'https:'].includes(baseUrl.protocol)
  || !['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname)
  || baseUrl.username || baseUrl.password || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) {
  throw new Error('FWX_E2E_BASE_URL must be a localhost origin. These tests create accounts and designs; production URLs are forbidden.')
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  outputDir: './node_modules/.cache/playwright-results',
  use: {
    baseURL: baseUrl.origin,
    browserName: 'chromium',
    // Use installed Chrome when requested; otherwise use `playwright install chromium`.
    channel: process.env.FWX_E2E_BROWSER_CHANNEL || undefined,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    // Traces capture request bodies, including generated registration credentials.
    trace: 'off',
    video: 'off',
  },
})
