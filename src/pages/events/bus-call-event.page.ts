import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { timeouts } from '../../../config/timeouts';

/**
 * Bus Call create form (buscallAdd.tpl).
 *
 * Server validateBuscall requires at least one of Crew or Band. If Crew Date is set,
 * Crew Time and Crew Time Zone are required. Title is not server-required but is the
 * Calendar marker (`{title} bus`). Hotel stays off. Band Date stays empty so Band
 * validators do not apply. Date is not prefilled from Calendar (eventdate mapping is
 * commented out in daysheet.php).
 */
export class BusCallEventPage {
  constructor(private readonly page: Page) {}

  private get form(): Locator {
    return this.page.locator('#show_frm');
  }

  private get crewDateInput(): Locator {
    return this.page.locator('#crew_showDate');
  }

  private get bandDateInput(): Locator {
    return this.page.locator('#band_showDate');
  }

  private get crewTimeInput(): Locator {
    return this.page.locator('#crew_time');
  }

  private get crewCountrySelect(): Locator {
    return this.page.locator('#crew_country_tz');
  }

  private get crewTimeZoneSelect(): Locator {
    return this.page.locator('#crew_timeZone');
  }

  private get crewTitleInput(): Locator {
    return this.page.locator('#crew_title');
  }

  private get hotelCheckbox(): Locator {
    return this.page.locator('#ishotel');
  }

  async expectCreateFormLoaded(): Promise<void> {
    await expect(this.form).toBeVisible();
    await expect(
      this.page.locator('.page_title').filter({ hasText: /ADD BUS CALL/i }),
    ).toBeVisible();
    await expect(this.crewDateInput).toBeVisible();
    await expect(this.crewTimeInput).toBeVisible();
    await expect(this.crewCountrySelect).toBeVisible();
    await expect(this.crewTimeZoneSelect).toBeVisible();
    await expect(this.crewTitleInput).toBeVisible();
  }

  /**
   * Crew Date is empty and readonly (jQuery datepicker). Playwright fill cannot edit it.
   */
  async fillCrewDate(displayDate: string): Promise<void> {
    await this.crewDateInput.evaluate((el, value) => {
      const win = window as unknown as {
        jQuery?: (selector: string) => {
          datepicker: (method: string, date: string) => void;
        };
      };
      const jq = win.jQuery;
      if (jq) {
        jq('#crew_showDate').datepicker('setDate', value);
      }
      (el as HTMLInputElement).value = value;
    }, displayDate);

    await expect(this.crewDateInput).toHaveValue(displayDate);
    await expect(this.bandDateInput).toHaveValue('');
  }

  async fillCrewTime(time: string): Promise<void> {
    await this.crewTimeInput.fill(time);
    await expect(this.crewTimeInput).toHaveValue(time);
  }

  async selectCrewMeridiem(meridiem: 'AM' | 'PM'): Promise<void> {
    const radio = this.form.locator(
      `input[name="crew_meridiem"][value="${meridiem}"]`,
    );
    await radio.check();
    await expect(radio).toBeChecked();
  }

  /**
   * Country reloads Crew Time Zone via getTimeZone_. Band TZ is not used on this path.
   * Hotel country AJAX also fires from selectCountry(); ignore it because Hotel stays off.
   */
  async selectCrewCountryAndTimeZone(countryCode: string): Promise<void> {
    const timeZoneOptions = this.page.waitForResponse(
      (response) => response.url().includes('getTimeZone_') && response.ok(),
      { timeout: timeouts.navigation },
    );

    const current = await this.crewCountrySelect.inputValue();
    if (current === countryCode) {
      await this.crewCountrySelect.evaluate((el) => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    } else {
      await this.crewCountrySelect.selectOption(countryCode);
    }

    await timeZoneOptions;

    await expect
      .poll(async () => this.crewTimeZoneSelect.locator('option').count(), {
        timeout: timeouts.expect,
      })
      .toBeGreaterThan(1);

    await this.selectFirstRealOption(this.crewTimeZoneSelect);
    await expect(this.crewTimeZoneSelect).not.toHaveValue('');
  }

  async fillCrewTitle(title: string): Promise<void> {
    await this.crewTitleInput.fill(title);
    await expect(this.crewTitleInput).toHaveValue(title);
  }

  async ensureHotelUnchecked(): Promise<void> {
    if ((await this.hotelCheckbox.count()) === 0) return;

    if (await this.hotelCheckbox.isChecked()) {
      await this.hotelCheckbox.uncheck();
    }
    await expect(this.hotelCheckbox).not.toBeChecked();
  }

  async expectRequiredFieldsFilled(title: string, time: string): Promise<void> {
    await expect(this.crewDateInput).not.toHaveValue('');
    await expect(this.crewTimeInput).toHaveValue(time);
    await expect(this.crewCountrySelect).not.toHaveValue('');
    await expect(this.crewTimeZoneSelect).not.toHaveValue('');
    await expect(this.crewTitleInput).toHaveValue(title);
    await expect(this.bandDateInput).toHaveValue('');

    if ((await this.hotelCheckbox.count()) > 0) {
      await expect(this.hotelCheckbox).not.toBeChecked();
    }
  }

  async saveBusCall(): Promise<void> {
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
        `Bus Call was not saved — application validation: "${validationMessage}"`,
      );
    }
  }

  private async clickSaveAndWaitForInsertResponse(): Promise<Response> {
    const savePost = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('route=common/daysheet/buscall') &&
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

    throw new Error('No selectable Crew Time Zone option found');
  }
}
