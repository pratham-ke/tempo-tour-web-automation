import { expect, type Page, type Response } from '@playwright/test';
import { timeouts } from '../../../config/timeouts';

/**
 * Block / Hold create form (blockAdd.tpl).
 * P0 required: Start Date, End Date, Title. Hotel stays off. Notes are optional.
 * There is no Country / Time Zone on this form.
 */
export class BlockEventPage {
  constructor(private readonly page: Page) {}

  private get form() {
    return this.page.locator('#show_frm');
  }

  private get startDateInput() {
    return this.page.locator('#startdate');
  }

  private get endDateInput() {
    return this.page.locator('#enddate');
  }

  private get titleInput() {
    return this.form.locator('input[name="title"]');
  }

  private get hotelCheckbox() {
    return this.page.locator('#ishotel');
  }

  async expectCreateFormLoaded(): Promise<void> {
    await expect(this.form).toBeVisible();
    await expect(
      this.page.locator('.page_title').filter({ hasText: /ADD BLOCK \/ HOLD/i }),
    ).toBeVisible();
    await expect(this.startDateInput).toBeVisible();
    await expect(this.endDateInput).toBeVisible();
    await expect(this.titleInput).toBeVisible();
  }

  async expectStartDatePrefilled(): Promise<void> {
    await expect(this.startDateInput).not.toHaveValue('');
  }

  /**
   * End Date is empty and readonly (jQuery datepicker). Playwright fill cannot edit it,
   * so set the date through datepicker. Server re-checks the range on SAVE.
   */
  async fillEndDate(displayDate: string): Promise<void> {
    await this.endDateInput.evaluate((el, value) => {
      const win = window as unknown as {
        jQuery?: (selector: string) => { datepicker: (method: string, date: string) => void };
      };
      const jq = win.jQuery;
      if (jq) {
        jq('#enddate').datepicker('setDate', value);
      }
      (el as HTMLInputElement).value = value;
    }, displayDate);

    await expect(this.endDateInput).toHaveValue(displayDate);
  }

  async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
    await expect(this.titleInput).toHaveValue(title);
  }

  async ensureHotelUnchecked(): Promise<void> {
    if ((await this.hotelCheckbox.count()) === 0) return;

    if (await this.hotelCheckbox.isChecked()) {
      await this.hotelCheckbox.uncheck();
    }
    await expect(this.hotelCheckbox).not.toBeChecked();
  }

  async expectRequiredFieldsFilled(title: string, endDate: string): Promise<void> {
    await expect(this.startDateInput).not.toHaveValue('');
    await expect(this.endDateInput).toHaveValue(endDate);
    await expect(this.titleInput).toHaveValue(title);

    if ((await this.hotelCheckbox.count()) > 0) {
      await expect(this.hotelCheckbox).not.toBeChecked();
    }
  }

  async saveBlock(): Promise<void> {
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
        `Block was not saved — application validation: "${validationMessage}"`,
      );
    }
  }

  private async clickSaveAndWaitForInsertResponse(): Promise<Response> {
    const savePost = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('route=common/daysheet/block') &&
        response.url().includes('action=insert'),
      { timeout: timeouts.heavyPage },
    );

    await this.form.locator('input[name="btnsubmit"][value="SAVE"]').first().click();

    return await savePost;
  }
}
