import { expect, type Locator, type Page } from '@playwright/test';
import { buildRoute, routes } from '../../config/routes';

/**
 * Monthly Calendar screen (`route=common/calendar`).
 *
 * Events are listed inside each date cell. Creating an event starts here:
 * click the cell’s Add (+) control, which opens a separate browser window
 * (`window.open`) rather than a same-page modal.
 */
export class CalendarPage {
  constructor(private readonly page: Page) {}

  async goto(month: number, year: number): Promise<void> {
    await this.page.goto(
      buildRoute(routes.calendar, { month, year }),
      { waitUntil: 'domcontentloaded' },
    );
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/index\.php\?route=common(%2F|\/)calendar/);
    await expect(this.page.locator('.calendar_area')).toBeVisible();
    await expect(this.page.locator('#month')).toBeVisible();
    await expect(this.page.locator('.calendar_table')).toBeVisible();
  }

  /**
   * Add (+) for one date. The app does not give this control a stable id;
   * it is identified by the inline handler `addeventpopup('YYYY-M-D')`.
   * Month and day are unpadded (e.g. 2027-12-5, not 2027-12-05).
   */
  addEventLinkForDate(isoDate: string): Locator {
    return this.page.locator(
      `a[onclick*="addeventpopup('${isoDate}')"]`,
    );
  }

  async openAddEventPopup(isoDate: string): Promise<Page> {
    const addLink = this.addEventLinkForDate(isoDate);
    // The (+) is an icon-font glyph with a zero-size box, so Playwright treats it as
    // hidden. force: true clicks the attached control without requiring visibility.
    await expect(addLink).toBeAttached();

    // Must subscribe to popup before the click — window.open is easy to miss otherwise.
    const popupPromise = this.page.waitForEvent('popup');
    await addLink.click({ force: true });
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    return popup;
  }

  /** Date cell that owns the Add (+) for this date — avoids matching other months’ leftover cells. */
  dateCell(isoDate: string): Locator {
    return this.page.locator('td.date_box').filter({
      has: this.addEventLinkForDate(isoDate),
    });
  }

  async expectEventMarkerOnDate(
    isoDate: string,
    marker: string,
  ): Promise<void> {
    const cell = this.dateCell(isoDate);
    // Calendar HTML can take a moment after a heavy save; wait on the unique marker,
    // not on a toast (the app does not show a reliable success message).
    await expect(cell.locator('.calendar_day_holder')).toContainText(marker, {
      timeout: 30_000,
    });
  }
}
