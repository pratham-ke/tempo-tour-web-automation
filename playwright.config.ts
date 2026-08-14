import fs from 'fs';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { getStorageStatePath } from './config/auth';
import { resolveAppContext } from './config';
import { timeouts } from './config/timeouts';
import { loadEnvFiles } from './src/utils/load-env';

loadEnvFiles();

const appContext = resolveAppContext();
const storageStatePath = path.join(
  process.cwd(),
  getStorageStatePath(appContext.environment, appContext.tenant, appContext.role),
);
const storageStateExists = fs.existsSync(storageStatePath);

/**
 * Playwright config for Tempo Tour web automation.
 *
 * Selection:
 *   TEST_ENV + TEST_TENANT + TEST_ROLE → resolveAppContext()
 *   → baseURL + optional storageState
 *
 * Auth setup project generates storageState files under auth/{env}/{tenant}/{role}.json
 * when credentials are present. Missing credentials skip setup cases (no hard failure).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  timeout: timeouts.test,
  expect: {
    timeout: timeouts.expect,
  },
  use: {
    baseURL: appContext.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: timeouts.action,
    navigationTimeout: timeouts.navigation,
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: appContext.baseUrl,
        // Only attach storageState when the file exists so the repo installs cleanly
        // without credentials. Run `npm run auth:setup` after filling .env.local.
        ...(storageStateExists ? { storageState: storageStatePath } : {}),
      },
    },
  ],
});
