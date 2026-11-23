import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { timeouts } from '../../../config/timeouts';

/**
 * Day Off create form (dayoffAdd.tpl).
 * P0 required: Date, Time Zone, City. Country is selected so Time Zone AJAX can run.
 * There is no venue. Hotel is left off. State / Title / Notes are not required.
 */
export class DayOffEventPage {
  constructor(private readonly page: Page) {}

  async expectCreateFormLoaded(): Promise<void> {
    await expect(this.page.locator('#show_frm')).toBeVisible();
    await expect(
      this.page.locator('.page_title').filter({ hasText: /ADD DAY OFF/i }),
    ).toBeVisible();
    await expect(this.page.locator('#showDate')).toBeVisible();
    await expect(this.page.locator('#country_tz')).toBeVisible();
    await expect(this.page.locator('#timeZone')).toBeVisible();
    await expect(this.page.locator('input[name="dayOffCity"]')).toBeVisible();
  }

  async expectDatePrefilled(): Promise<void> {
    await expect(this.page.locator('#showDate')).not.toHaveValue('');
  }

  /**
   * Country reloads Time Zone via getTimeZone_. Do not wait on Show venue #state —
   * Day Off state is #dstate and is not required for this P0.
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

  async fillCity(city: string): Promise<void> {
    const cityInput = this.page.locator('input[name="dayOffCity"]');
    await cityInput.fill(city);
    await expect(cityInput).toHaveValue(city);
  }

  async ensureHotelUnchecked(): Promise<void> {
    const hotel = this.page.locator('#ishotel');
    if ((await hotel.count()) === 0) return;

    if (await hotel.isChecked()) {
      await hotel.uncheck();
    }
    await expect(hotel).not.toBeChecked();
  }

  async expectRequiredFieldsFilled(city: string): Promise<void> {
    await expect(this.page.locator('#showDate')).not.toHaveValue('');
    await expect(this.page.locator('#country_tz')).not.toHaveValue('');
    await expect(this.page.locator('#timeZone')).not.toHaveValue('');
    await expect(this.page.locator('input[name="dayOffCity"]')).toHaveValue(city);

    const hotel = this.page.locator('#ishotel');
    if ((await hotel.count()) > 0) {
      await expect(hotel).not.toBeChecked();
    }
  }

  async saveDayOff(): Promise<void> {
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
        `Day Off was not saved — application validation: "${validationMessage}"`,
      );
    }
  }

  private async clickSaveAndWaitForInsertResponse(): Promise<Response> {
    const savePost = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('daysheet/dayoff') &&
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
