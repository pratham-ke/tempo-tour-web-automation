import type { Page } from '@playwright/test';
import { AddEventPopupPage } from '../pages/add-event-popup.page';
import { CalendarPage } from '../pages/calendar.page';
import { ShowEventPage } from '../pages/events/show-event.page';
import { uniqueSuffix } from '../utils/unique';

export interface CreateShowEventResult {
  /** Calendar date string used in addeventpopup onclick, e.g. 2027-12-15 */
  isoDate: string;
  month: number;
  year: number;
  day: number;
  venueName: string;
  /** Unique city marker asserted on the Calendar */
  cityMarker: string;
}

/**
 * Business workflow for P0 Create Show:
 * Calendar → date Add (+) → Add Event popup → Show → fill required fields → SAVE
 * → open Calendar month → assert unique venue city on that date.
 *
 * The spec stays thin; this class owns the user journey and test data.
 */
export class CreateShowEventFlow {
  constructor(private readonly page: Page) {}

  /**
   * Date is next year’s 15 December so it is deterministic (not “today”) and still
   * valid. Other events on that day are allowed — we do not require an empty cell.
   * isoDate is unpadded (`2027-12-15`) to match Calendar’s addeventpopup() argument.
   */
  async createMinimalShowFromCalendar(): Promise<CreateShowEventResult> {
    const year = new Date().getFullYear() + 1;
    const month = 12;
    const day = 15;
    const isoDate = `${year}-${month}-${day}`;

    const suffix = uniqueSuffix();
    // City uses alpha_space (jquery.alphanumeric): letters/spaces only — digits are wiped on blur.
    // Do not use "E2E" (contains digit 2).
    const cityMarker = `ETE${suffix}`;
    const venueName = `ETE Show ${suffix}`;
    const venue = {
      name: venueName,
      city: cityMarker,
      stateLabel: 'Alabama',
    };

    const calendar = new CalendarPage(this.page);
    await calendar.goto(month, year);

    const popup = await calendar.openAddEventPopup(isoDate);
    const addEventPopup = new AddEventPopupPage(popup);
    await addEventPopup.expectLoaded();
    await addEventPopup.selectEventType('show');
    await addEventPopup.confirmAndWaitForOpenerNavigation(
      this.page,
      'route=common/daysheet/show',
    );

    const showForm = new ShowEventPage(this.page);
    await showForm.expectCreateFormLoaded();
    await showForm.expectDatePrefilled();

    await showForm.selectCountryAndTimeZone('US');

    // P0: new venue (Select Venue stays empty), Hotel and Flight stay off.
    await showForm.ensureVenueSelectEmpty();
    await showForm.ensureHotelUnchecked();
    await showForm.ensureFlightUnchecked();

    await showForm.fillNewVenue(venue, 'US');

    await showForm.expectMandatoryFieldsFilled(venue);
    await showForm.saveShow();

    // Local saves may not redirect to Calendar. Open the event month explicitly
    // so verification does not depend on redirect behaviour.
    await calendar.goto(month, year);
    await calendar.expectEventMarkerOnDate(isoDate, cityMarker);

    return {
      isoDate,
      month,
      year,
      day,
      venueName,
      cityMarker,
    };
  }
}
