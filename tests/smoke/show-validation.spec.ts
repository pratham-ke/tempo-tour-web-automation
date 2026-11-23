import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { getStorageStatePath } from '../../config/auth';
import { getTenantBaseUrl } from '../../config/environments';
import { CreateShowEventFlow } from '../../src/flows/create-show-event.flow';

/**
 * P0: Show required-field validation — Venue Type left empty.
 *
 * Super Admin fills every other required field, SAVE, and must stay on the form
 * with "Please enter venue type". No Show/venue is created (unique city is not
 * on Calendar). Login uses existing storageState.
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

test.describe('Show required-field validation @smoke', () => {
  test.beforeAll(() => {
    test.skip(
      !fs.existsSync(storageState),
      `Missing storageState at ${storageState}. Run: npm run auth:setup`,
    );
  });

  test('should reject Show create when Venue Type is empty', async ({ page }) => {
    test.setTimeout(120_000);

    const flow = new CreateShowEventFlow(page);
    const result = await flow.submitShowWithEmptyVenueType();

    expect(result.cityMarker).toMatch(/^ETE/);
    expect(result.venueName).toMatch(/^ETE Show /);
  });
});
