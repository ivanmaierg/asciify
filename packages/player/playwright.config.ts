import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  use: {
    browserName: 'chromium',
    headless: true,
  },
})
