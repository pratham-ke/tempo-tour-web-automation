import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { timeouts } from '../../../config/timeouts';

/**
 * Appearance create form (appearanceAdd.tpl).
 * P0 required: Date, Time, Time Zone, Title. Country is selected so Time Zone AJAX can run.
 * Venue and Hotel stay off. Location City/State and other optional fields stay empty.
 * Meridiem stays at default PM.
 */
export class AppearanceEventPage {
  constructor(private readonly page: Page) {}

  private get form(): Locator {
    return this.page.locator('#show_frm');
  }

  private get dateInput(): Locator {
    return this.page.locator('#showDate');
  }

  private get countrySelect(): Locator {
    return this.page.locator('#country_tz');
  }

  private get timeZoneSelect(): Locator {
    return this.page.locator('#timeZone');
  }

  private get timeInput(): Locator {
    return this.page.locator('#time');
  }

  private get titleInput(): Locator {
    return this.form.locator('input[name="title"]');
  }

  private get venueCheckbox(): Locator {
    return this.page.locator('#isvenue');
  }

  private get hotelCheckbox(): Locator {
    return this.page.locator('#ishotel');
  }

  async expectCreateFormLoaded(): Promise<void> {
    await expect(this.form).toBeVisible();
    await expect(
      this.page.locator('.page_title').filter({ hasText: /ADD APPEARANCE \/ PROMOTIONAL/i }),
    ).toBeVisible();
    await expect(this.dateInput).toBeVisible();
    await expect(this.timeInput).toBeVisible();
    await expect(this.countrySelect).toBeVisible();
    await expect(this.timeZoneSelect).toBeVisible();
    await expect(this.titleInput).toBeVisible();
  }

  async expectDatePrefilled(): Promise<void> {
    await expect(this.dateInput).not.toHaveValue('');
  }

  /**
   * Time starts empty on create (unlike Date, which is prefilled from the Calendar cell).
   * Fill a 5-character clock value so applyTime blur does not swap the txtTime class.
   */
  async fillTime(time: string): Promise<void> {
    await this.timeInput.fill(time);
    await expect(this.timeInput).toHaveValue(time);
  }

  /**
   * Country reloads Time Zone via getTimeZone_. Add-mode also fires hotel/daysheet/venue
   * state AJAX (including a missing Show #state). Wait only for getTimeZone_ — Venue/Hotel
   * stay off and location State is not required.
   */
  async selectCountryAndTimeZone(countryCode: string): Promise<void> {
    const timeZoneOptions = this.page.waitForResponse(
      (response) => response.url().includes('getTimeZone_') && response.ok(),
      { timeout: timeouts.navigation },
    );

    await this.countrySelect.selectOption(countryCode);
    await timeZoneOptions;

    await expect
      .poll(async () => this.timeZoneSelect.locator('option').count(), {
        timeout: timeouts.expect,
      })
      .toBeGreaterThan(1);

    await this.selectFirstRealOption(this.timeZoneSelect);
    await expect(this.timeZoneSelect).not.toHaveValue('');
  }

  async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
    await expect(this.titleInput).toHaveValue(title);
  }

  async ensureVenueUnchecked(): Promise<void> {
    if ((await this.venueCheckbox.count()) === 0) return;

    if (await this.venueCheckbox.isChecked()) {
      await this.venueCheckbox.uncheck();
    }
    await expect(this.venueCheckbox).not.toBeChecked();
  }

  async ensureHotelUnchecked(): Promise<void> {
    if ((await this.hotelCheckbox.count()) === 0) return;

    if (await this.hotelCheckbox.isChecked()) {
      await this.hotelCheckbox.uncheck();
    }
    await expect(this.hotelCheckbox).not.toBeChecked();
  }

  async expectRequiredFieldsFilled(title: string, time: string): Promise<void> {
    await expect(this.dateInput).not.toHaveValue('');
    await expect(this.timeInput).toHaveValue(time);
    await expect(this.countrySelect).not.toHaveValue('');
    await expect(this.timeZoneSelect).not.toHaveValue('');
    await expect(this.titleInput).toHaveValue(title);

    if ((await this.venueCheckbox.count()) > 0) {
      await expect(this.venueCheckbox).not.toBeChecked();
    }
    if ((await this.hotelCheckbox.count()) > 0) {
      await expect(this.hotelCheckbox).not.toBeChecked();
    }
  }

  async saveAppearance(): Promise<void> {
    const response = await this.clickSaveAndWaitForInsertResponse();
    expect(
      response.status(),
      'SAVE request should be accepted by the application',
    ).toBeLessThan(400);

    if ((await this.form.count()) === 0) {
      return;
    }

    const errorMsg = this.form.locator('.error_msg').first();
    if ((await errorMsg.count()) === 0) {
      return;
    }

    const validationMessage = (await errorMsg.textContent({ timeout: 1_000 }))?.trim();
    if (validationMessage) {
      throw new Error(
        `Appearance was not saved — application validation: "${validationMessage}"`,
      );
    }
  }

  private async clickSaveAndWaitForInsertResponse(): Promise<Response> {
    const savePost = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('route=common/daysheet/appearance') &&
        response.url().includes('action=insert'),
      { timeout: timeouts.heavyPage },
    );

    await this.form.locator('input[name="btnsubmit"][value="SAVE"]').first().click();

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
