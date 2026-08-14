import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { getStorageStatePath } from '../../config/auth';
import { getTenantBaseUrl } from '../../config/environments';
import { buildRoute, routes } from '../../config/routes';

/**
 * Smoke verification: storageState reuse for local + kedemo + Super Admin.
 * Does not perform UI login — relies on auth/local/kedemo/super-admin.json.
 */
const environment = 'local' as const;
const tenant = 'kedemo' as const;
const role = 'super-admin' as const;

const baseURL = getTenantBaseUrl(environment, tenant);
const storageState = path.join(
  process.cwd(),
  getStorageStatePath(environment, tenant, role),
);

test.use({
  baseURL,
  storageState,
});

test.describe('Authenticated session reuse @smoke', () => {
  test.beforeAll(() => {
    test.skip(
      !fs.existsSync(storageState),
      `Missing storageState at ${storageState}. Run: npm run auth:setup`,
    );
  });

  test('should open Calendar using existing Super Admin storageState without UI login', async ({
    page,
  }) => {
    await page.goto(buildRoute(routes.calendar), {
      waitUntil: 'domcontentloaded',
    });

    // Authenticated: must not be on the login screen
    await expect(page.locator('#username')).toHaveCount(0);
    await expect(
      page.locator('input[type="submit"][value="LOGIN"]'),
    ).toHaveCount(0);

    // Expected Calendar route (accept encoded or literal slash in route value)
    await expect(page).toHaveURL(/index\.php\?route=common(%2F|\/)calendar/);

    // Stable Calendar page indicator from calendar.tpl (.calendar_area wraps month/year + grid)
    await expect(page.locator('.calendar_area')).toBeVisible();
    await expect(page.locator('#month')).toBeVisible();
    await expect(page.locator('.calendar_table')).toBeVisible();
  });
});
