import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { getStorageStatePath } from '../../config/auth';
import { getTenantBaseUrl } from '../../config/environments';
import { CreateShowEventFlow } from '../../src/flows/create-show-event.flow';

/**
 * P0 smoke: Super Admin creates a Show from Calendar with only required fields.
 *
 * Login is not in this test — we reuse `auth/local/kedemo/super-admin.json`.
 * Locators and UI steps live in page objects / the flow, not here.
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

test.describe('Create Show event @smoke', () => {
  test.beforeAll(() => {
    test.skip(
      !fs.existsSync(storageState),
      `Missing storageState at ${storageState}. Run: npm run auth:setup`,
    );
  });

  test('should create a Show from Calendar using minimal required fields', async ({
    page,
  }) => {
    // Default test timeout is 60s; SAVE plus Calendar reload regularly exceeds that.
    test.setTimeout(120_000);

    const flow = new CreateShowEventFlow(page);
    const result = await flow.createMinimalShowFromCalendar();

    expect(result.cityMarker).toMatch(/^ETE/);
    expect(result.venueName).toMatch(/^ETE Show /);
  });
});
