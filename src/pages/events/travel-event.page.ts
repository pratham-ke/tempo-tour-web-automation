import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { timeouts } from '../../../config/timeouts';

/**
 * Travel create form (travelAdd.tpl).
 * P0 required: Date, Time Zone, Title. Country is selected so Time Zone AJAX can run.
 * City / State / Zip / Notes / Flight are optional. Hotel and Travel Users stay off.
 */
export class TravelEventPage {
  constructor(private readonly page: Page) {}

  async expectCreateFormLoaded(): Promise<void> {
    await expect(this.page.locator('#show_frm')).toBeVisible();
    await expect(
      this.page.locator('.page_title').filter({ hasText: /ADD TRAVEL/i }),
    ).toBeVisible();
    await expect(this.page.locator('#showDate')).toBeVisible();
    await expect(this.page.locator('#country_tz')).toBeVisible();
    await expect(this.page.locator('#timeZone')).toBeVisible();
    await expect(this.page.locator('#show_frm input[name="title"]')).toBeVisible();
  }

  async expectDatePrefilled(): Promise<void> {
    await expect(this.page.locator('#showDate')).not.toHaveValue('');
  }

  /**
   * Country reloads Time Zone via getTimeZone_. Do not wait on Show venue #state —
   * Travel state is #dstate and is not required for this P0. Hotel country AJAX
   * also fires on change; we ignore it because Hotel stays off.
   */
  async selectCountryAndTimeZone(countryCode: string): Promise<void> {
    const timeZoneOptions = this.page.waitForResponse(
      (response) => response.url().includes('getTimeZone_') && response.ok(),
      { timeout: timeouts.navigation },
    );

    await this.page.locator('#country_tz').selectOption(countryCode);
    await timeZoneOptions;

    const timeZone = this.page.locator('#timeZone');
    await expect
      .poll(async () => timeZone.locator('option').count(), {
        timeout: timeouts.expect,
      })
      .toBeGreaterThan(1);

    await this.selectFirstRealOption(timeZone);
    await expect(timeZone).not.toHaveValue('');
  }

  async fillTitle(title: string): Promise<void> {
    const titleInput = this.page.locator('#show_frm input[name="title"]');
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
  }

  async ensureHotelUnchecked(): Promise<void> {
    const hotel = this.page.locator('#ishotel');
    if ((await hotel.count()) === 0) return;

    if (await hotel.isChecked()) {
      await hotel.uncheck();
    }
    await expect(hotel).not.toBeChecked();
  }

  async ensureTravelUsersUnchecked(): Promise<void> {
    const travelUsers = this.page.locator('#isDisplayTravelUser');
    if ((await travelUsers.count()) === 0) return;

    if (await travelUsers.isChecked()) {
      await travelUsers.uncheck();
    }
    await expect(travelUsers).not.toBeChecked();
  }

  async expectRequiredFieldsFilled(title: string): Promise<void> {
    await expect(this.page.locator('#showDate')).not.toHaveValue('');
    await expect(this.page.locator('#country_tz')).not.toHaveValue('');
    await expect(this.page.locator('#timeZone')).not.toHaveValue('');
    await expect(this.page.locator('#show_frm input[name="title"]')).toHaveValue(title);
    await expect(this.page.locator('input[name="travelCity"]')).toHaveValue('');

    const hotel = this.page.locator('#ishotel');
    if ((await hotel.count()) > 0) {
      await expect(hotel).not.toBeChecked();
    }
  }

  async saveTravel(): Promise<void> {
    const response = await this.clickSaveAndWaitForInsertResponse();
    expect(
      response.status(),
      'SAVE request should be accepted by the application',
    ).toBeLessThan(400);

    const form = this.page.locator('#show_frm');
    if ((await form.count()) === 0) {
      return;
    }

    const errorMsg = form.locator('.error_msg').first();
    if ((await errorMsg.count()) === 0) {
      return;
    }

    const validationMessage = (await errorMsg.textContent({ timeout: 1_000 }))?.trim();
    if (validationMessage) {
      throw new Error(
        `Travel was not saved — application validation: "${validationMessage}"`,
      );
    }
  }

  private async clickSaveAndWaitForInsertResponse(): Promise<Response> {
    const savePost = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('daysheet/travel') &&
        response.url().includes('action=insert'),
      { timeout: timeouts.heavyPage },
    );

    await this.page
      .locator('#show_frm input[name="btnsubmit"][value="SAVE"]')
      .first()
      .click();

    return await savePost;
  }

  private async selectFirstRealOption(select: Locator): Promise<void> {
    const options = select.locator('option');
    const count = await options.count();

    for (let index = 0; index < count; index++) {
      const value = await options.nth(index).getAttribute('value');
      if (value && value.trim() !== '') {
        await select.selectOption(value);
        return;
      }
    }

    throw new Error('No selectable Time Zone option found');
  }
}
