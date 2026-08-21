import { expect, type Page } from '@playwright/test';

export type AddEventType =
  | 'show'
  | 'travel'
  | 'dayoff'
  | 'block'
  | 'appearance'
  | 'rehearsal'
  | 'buscall'
  | 'miscellaneous';

/**
 * Add Event popup (separate window from Calendar).
 *
 * Choosing an event type and clicking ENTER does not submit this popup as a form
 * in isolation: it navigates the *opener* (the Calendar tab) to the matching
 * daysheet create screen, then the popup typically closes.
 */
export class AddEventPopupPage {
  constructor(private readonly popup: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(this.popup.locator('.popup-title')).toContainText('Add Event');
    await expect(
      this.popup.locator('input[type="button"][value="ENTER"]'),
    ).toBeVisible();
  }

  async selectEventType(type: AddEventType): Promise<void> {
    const radio = this.popup.locator(
      `input[name="showType"][value="${type}"]`,
    );
    await expect(radio).toBeVisible();
    await radio.check();
  }

  /**
   * ENTER is clicked in the popup, but the URL we wait for is the opener’s.
   * Waiting for both together avoids racing past the Show form load.
   */
  async confirmAndWaitForOpenerNavigation(
    opener: Page,
    expectedRoutePart: string,
  ): Promise<void> {
    await Promise.all([
      opener.waitForURL(
        (url) => url.href.includes(expectedRoutePart),
        { timeout: 30_000 },
      ),
      this.popup.locator('input[type="button"][value="ENTER"]').click(),
    ]);

    // Popup should close after navigation; ignore if already closed.
    await this.popup.waitForEvent('close', { timeout: 5_000 }).catch(() => undefined);
  }
}
