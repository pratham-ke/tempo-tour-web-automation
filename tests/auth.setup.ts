import fs from 'fs';
import path from 'path';
import { chromium, expect, test as setup } from '@playwright/test';
import {
  AUTH_SETUP_ROLES,
  getStorageStateDir,
  getStorageStatePath,
} from '../config/auth';
import { resolveEnvironment } from '../config';
import { getTenantBaseUrl } from '../config/environments';
import { TENANT_KEYS } from '../config/tenants';
import type { RoleKey, TenantKey } from '../config/types';
import { LoginPage } from '../src/pages/login.page';
import { readCredentials } from '../src/utils/credentials';
import { loadEnvFiles } from '../src/utils/load-env';

loadEnvFiles();

const environment = resolveEnvironment();

type AuthCombo = {
  tenant: TenantKey;
  role: RoleKey;
};

const combos: AuthCombo[] = TENANT_KEYS.flatMap((tenant) =>
  AUTH_SETUP_ROLES.map((role) => ({ tenant, role })),
);

for (const { tenant, role } of combos) {
  const label = `${environment}/${tenant}/${role}`;

  // Intentionally no browser fixture — skip missing credentials without launching Chromium.
  setup(`authenticate ${label}`, async () => {
    const credentials = readCredentials(tenant, role);

    if (!credentials) {
      setup.skip(true, `Skipping ${label}: credentials not set in environment / .env.local`);
      return;
    }

    const { username, password } = credentials;
    const baseUrl = getTenantBaseUrl(environment, tenant);
    const statePath = getStorageStatePath(environment, tenant, role);
    const stateDir = getStorageStateDir(environment, tenant);

    fs.mkdirSync(path.join(process.cwd(), stateDir), { recursive: true });

    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL: baseUrl,
    });
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    try {
      await loginPage.goto(baseUrl);
      await expect(loginPage.usernameInput()).toBeVisible();
      await expect(loginPage.loginButton()).toBeEnabled();

      await loginPage.login(username, password);

      const errorVisible = await loginPage
        .errorMessage()
        .isVisible()
        .catch(() => false);

      if (errorVisible) {
        const message = (await loginPage.errorMessage().innerText()).trim();
        throw new Error(`Login failed for ${label}: ${message}`);
      }

      await loginPage.expectAuthenticatedLanding();

      await context.storageState({
        path: path.join(process.cwd(), statePath),
      });
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
