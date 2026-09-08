import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { getStorageStatePath } from '../../config/auth';
import { getTenantBaseUrl } from '../../config/environments';
import { CreateMiscellaneousEventFlow } from '../../src/flows/create-miscellaneous-event.flow';

/**
 * P0 smoke: Super Admin creates a Miscellaneous event from Calendar with required fields only.
 * Reuses existing storageState (no UI login).
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

test.describe('Create Miscellaneous event @smoke', () => {
  test.beforeAll(() => {
    test.skip(
      !fs.existsSync(storageState),
      `Missing storageState at ${storageState}. Run: npm run auth:setup`,
    );
  });

  test('should create a Miscellaneous event from Calendar using minimal required fields', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const flow = new CreateMiscellaneousEventFlow(page);
    const result = await flow.createMinimalMiscellaneousFromCalendar();

    expect(result.titleMarker).toMatch(/^ETE/);
  });
});
