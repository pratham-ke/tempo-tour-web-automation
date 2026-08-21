import { expect, type Locator, type Page } from '@playwright/test';
import { timeouts } from '../../../config/timeouts';

export interface NewVenueInput {
  name: string;
  city: string;
  /** Used when venue country is US/CA (State is a dropdown). */
  stateLabel?: string;
  /** Used when venue country is not US/CA (State is a text field). */
  stateText?: string;
}

/**
 * Show / Performance create form (`showAdd.tpl`).
 *
 * P0 mandatory fields (Hotel Name is NOT required unless Hotel is checked):
 * Date, Country, Time Zone, Venue Name, City, State, Venue Type.
 *
 * Country has two effects: Time Zone options reload via AJAX, and State is either
 * a dropdown (US/CA) or a text field (other countries).
 */
export class ShowEventPage {
  constructor(private readonly page: Page) {}

  async expectCreateFormLoaded(): Promise<void> {
    await expect(this.page.locator('#show_frm')).toBeVisible();
    // The page also has an ALERT title using the same class; filter to this heading.
    await expect(
      this.page.locator('.page_title').filter({ hasText: /ADD EVENT/i }),
    ).toBeVisible();
    await expect(this.page.locator('#showDate')).toBeVisible();
    await expect(this.page.locator('#country_tz')).toBeVisible();
    await expect(this.page.locator('#timeZone')).toBeVisible();
    await expect(this.page.locator('#venue_form')).toBeVisible();
  }

  /** Date is pre-filled from the Calendar date that opened this form. */
  async expectDatePrefilled(): Promise<void> {
    await expect(this.page.locator('#showDate')).not.toHaveValue('');
  }

  /**
   * Country drives the Time Zone list (selectTZ replaces #timeZone via AJAX),
   * so wait for that response instead of guessing with a delay.
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

  /**
   * Leave "Select Venue" on --Please Select-- so the venue is created manually and
   * the checkNextShow / Google distance path is not triggered.
   */
  async ensureVenueSelectEmpty(): Promise<void> {
    const venueSelect = this.page.locator('#venue_sel');
    await expect(venueSelect).toBeVisible();

    // Re-selecting fires a change handler that clears the venue fields, so only act if needed.
    if ((await venueSelect.inputValue()) !== '') {
      await venueSelect.selectOption('');
    }
    await expect(venueSelect).toHaveValue('');
  }

  /** Hotel Name is only mandatory when this checkbox is on; P0 leaves it off. */
  async ensureHotelUnchecked(): Promise<void> {
    const hotel = this.page.locator('#ishotel');
    if ((await hotel.count()) === 0) return;

    if (await hotel.isChecked()) {
      await hotel.uncheck();
    }
    await expect(hotel).not.toBeChecked();
  }

  async ensureFlightUnchecked(): Promise<void> {
    const flight = this.page.locator('#flight_chk');
    if ((await flight.count()) === 0) return;

    if ((await flight.isVisible()) && (await flight.isChecked())) {
      await flight.uncheck();
    }
    await expect(flight).not.toBeChecked();
  }

  async fillNewVenue(
    venue: NewVenueInput,
    venueCountryCode: string = 'US',
  ): Promise<void> {
    await this.applyVenueCountry(venueCountryCode);

    await this.page.locator('#venue_form input[name="name"]').fill(venue.name);
    await this.page.locator('#venue_form input[name="city"]').fill(venue.city);

    await this.selectVenueType();

    // State is chosen last: the country AJAX rebuilds the State dropdown and would
    // discard an earlier selection.
    await this.selectVenueState(venue);
  }

  /** Venue Type is mandatory and comes from the application's own list. */
  async selectVenueType(): Promise<void> {
    const venueType = this.page.locator('#venuetype');
    await expect(venueType).toBeVisible();
    await this.selectFirstRealOption(venueType);
    await expect(venueType).not.toHaveValue('');
  }

  /** Guard for the confirmed mandatory set before submitting. */
  async expectMandatoryFieldsFilled(venue: NewVenueInput): Promise<void> {
    await expect(this.page.locator('#showDate')).not.toHaveValue('');
    await expect(this.page.locator('#country_tz')).not.toHaveValue('');
    await expect(this.page.locator('#timeZone')).not.toHaveValue('');
    await expect(this.page.locator('#venue_sel')).toHaveValue('');
    await expect(
      this.page.locator('#venue_form input[name="name"]'),
    ).toHaveValue(venue.name);
    await expect(
      this.page.locator('#venue_form input[name="city"]'),
    ).toHaveValue(venue.city);
    await expect(this.page.locator('#venuetype')).not.toHaveValue('');

    const stateSelect = this.page.locator('#state');
    if (await stateSelect.isVisible()) {
      await expect(stateSelect).not.toHaveValue('');
    } else {
      await expect(this.page.locator('#state1')).not.toHaveValue('');
    }
  }

  /**
   * SAVE is slow (the server does post-save work) and there is no success message,
   * so we wait for the save request itself to be answered instead of a toast or a
   * fixed delay. When the application rejects the data it re-renders this form with
   * messages in .error_msg, which we surface as a readable failure.
   */
  async saveShow(): Promise<void> {
    const savePost = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('action=insert'),
      { timeout: timeouts.heavyPage },
    );

    // The form can render more than one SAVE control; scope to #show_frm and take the first.
    await this.page
      .locator('#show_frm input[name="btnsubmit"][value="SAVE"]')
      .first()
      .click();

    const response = await savePost;
    expect(
      response.status(),
      'SAVE request should be accepted by the application',
    ).toBeLessThan(400);

    // Successful local saves often replace the document with a blank body, so the
    // form is gone. Only read validation text when the form is still present —
    // avoid waiting the full action timeout on the happy path.
    const showForm = this.page.locator('#show_frm');
    if ((await showForm.count()) === 0) {
      return;
    }

    const errorMsg = showForm.locator('.error_msg').first();
    if ((await errorMsg.count()) === 0) {
      return;
    }

    const validationMessage = (await errorMsg.textContent({ timeout: 1_000 }))?.trim();

    if (validationMessage) {
      throw new Error(
        `Show was not saved — application validation: "${validationMessage}"`,
      );
    }
  }

  /**
   * ChkCountry() shows the State dropdown (US/CA) or the State text field and loads
   * options via `common/state/get`.
   *
   * If timezone country already set the venue country, `selectOption` would no-op and
   * AJAX would never run — then invoke ChkCountry once. Do not invoke it again after
   * State is chosen: a late rebuild of the <select> posts `state=""`.
   */
  private async applyVenueCountry(countryCode: string): Promise<void> {
    const venueCountry = this.page.locator('#venue_form #country');
    if ((await venueCountry.count()) === 0) return;

    const usesStateDropdown = countryCode === 'US' || countryCode === 'CA';
    const stateOptions = usesStateDropdown
      ? this.page.waitForResponse(
          (response) =>
            response.url().includes('route=common/state/get') && response.ok(),
          { timeout: timeouts.navigation },
        )
      : null;

    if ((await venueCountry.inputValue()) === countryCode) {
      // Timezone country already synced this select, so onchange would not fire.
      await this.page.evaluate((code) => {
        const chkCountry = (
          window as unknown as { ChkCountry?: (value: string) => void }
        ).ChkCountry;
        chkCountry?.(code);
      }, countryCode);
    } else {
      await venueCountry.selectOption(countryCode);
    }

    await stateOptions;
  }

  /** US/CA → visible `#state` dropdown; other countries → `#state1` text. */
  private async selectVenueState(venue: NewVenueInput): Promise<void> {
    const stateSelect = this.page.locator('#state');

    if (await stateSelect.isVisible()) {
      await expect
        .poll(async () => stateSelect.locator('option').count(), {
          timeout: timeouts.expect,
        })
        .toBeGreaterThan(1);

      if (venue.stateLabel) {
        await stateSelect.selectOption({ label: venue.stateLabel });
      } else {
        await this.selectFirstRealOption(stateSelect);
      }
      await expect(stateSelect).not.toHaveValue('');
      return;
    }

    const stateText = this.page.locator('#state1');
    await stateText.fill(venue.stateText ?? 'Teststate');
    await expect(stateText).not.toHaveValue('');
  }

  /** Skips the leading --Please Select-- (empty value) option. */
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

    throw new Error('No selectable option found (only --Please Select--)');
  }
}
