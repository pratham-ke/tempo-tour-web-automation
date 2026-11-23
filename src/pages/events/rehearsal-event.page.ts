import { expect, type Page } from '@playwright/test';
import { ShowEventPage, type NewVenueInput } from './show-event.page';

/**
 * Calendar Rehearsal is not rehearsalAdd.tpl. Add Event special-cases the
 * rehearsal radio to `common/daysheet/show&eventtype=2` (showAdd.tpl).
 * Event Type is a disabled select plus hidden `#eventType` posted as `2`.
 */
export class RehearsalEventPage {
  private readonly showForm: ShowEventPage;

  constructor(private readonly page: Page) {
    this.showForm = new ShowEventPage(page);
  }

  async expectCreateFormLoaded(): Promise<void> {
    await this.showForm.expectCreateFormLoaded();
    await expect(this.page.locator('#eventType')).toHaveValue('2');
    await expect(this.page.locator('#eventType_')).toHaveValue('2');
  }

  async expectDatePrefilled(): Promise<void> {
    await this.showForm.expectDatePrefilled();
  }

  async selectCountryAndTimeZone(countryCode: string): Promise<void> {
    await this.showForm.selectCountryAndTimeZone(countryCode);
  }

  async ensureVenueSelectEmpty(): Promise<void> {
    await this.showForm.ensureVenueSelectEmpty();
  }

  async ensureHotelUnchecked(): Promise<void> {
    await this.showForm.ensureHotelUnchecked();
  }

  async ensureFlightUnchecked(): Promise<void> {
    await this.showForm.ensureFlightUnchecked();
  }

  async fillNewVenue(venue: NewVenueInput, venueCountryCode: string = 'US'): Promise<void> {
    await this.showForm.fillNewVenue(venue, venueCountryCode);
  }

  async expectMandatoryFieldsFilled(venue: NewVenueInput): Promise<void> {
    await this.showForm.expectMandatoryFieldsFilled(venue);
    await expect(this.page.locator('#eventType')).toHaveValue('2');
  }

  async saveRehearsal(): Promise<void> {
    await this.showForm.saveShow();
  }
}
