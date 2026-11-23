import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { getStorageStatePath } from '../../config/auth';
import { getTenantBaseUrl } from '../../config/environments';
import { CreateRehearsalEventFlow } from '../../src/flows/create-rehearsal-event.flow';

/**
 * P0 smoke: Super Admin creates a Calendar Rehearsal (Show form, eventtype=2).
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

test.describe('Create Rehearsal event @smoke', () => {
  test.beforeAll(() => {
    test.skip(
      !fs.existsSync(storageState),
      `Missing storageState at ${storageState}. Run: npm run auth:setup`,
    );
  });

  test('should create a Rehearsal from Calendar using minimal required fields', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const flow = new CreateRehearsalEventFlow(page);
    const result = await flow.createMinimalRehearsalFromCalendar();

    expect(result.cityMarker).toMatch(/^ETE/);
    expect(result.venueName).toMatch(/^ETE Rehearsal /);
  });
});
