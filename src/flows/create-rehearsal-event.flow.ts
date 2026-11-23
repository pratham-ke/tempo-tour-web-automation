import type { Page } from '@playwright/test';
import { AddEventPopupPage } from '../pages/add-event-popup.page';
import { CalendarPage } from '../pages/calendar.page';
import { RehearsalEventPage } from '../pages/events/rehearsal-event.page';
import { uniqueSuffix } from '../utils/unique';

export interface CreateRehearsalEventResult {
  isoDate: string;
  month: number;
  year: number;
  day: number;
  venueName: string;
  cityMarker: string;
}

/**
 * Calendar → Add Event → Rehearsal (Show form, eventtype=2) → required venue fields
 * → SAVE → Calendar verify unique venue city.
 */
export class CreateRehearsalEventFlow {
  constructor(private readonly page: Page) {}

  /**
   * Same date strategy as other P0s: next year’s 15 December (unpadded isoDate).
   * Occupied dates are allowed. Calendar lists this Rehearsal as type "Rehearsal"
   * plus venue city — the unique city is the marker.
   */
  async createMinimalRehearsalFromCalendar(): Promise<CreateRehearsalEventResult> {
    const year = new Date().getFullYear() + 1;
    const month = 12;
    const day = 15;
    const isoDate = `${year}-${month}-${day}`;

    const suffix = uniqueSuffix();
    const cityMarker = `ETE${suffix}`;
    const venueName = `ETE Rehearsal ${suffix}`;
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
    await addEventPopup.selectEventType('rehearsal');
    await addEventPopup.confirmAndWaitForOpenerNavigation(
      this.page,
      'route=common/daysheet/show&eventtype=2',
    );

    const rehearsalForm = new RehearsalEventPage(this.page);
    await rehearsalForm.expectCreateFormLoaded();
    await rehearsalForm.expectDatePrefilled();
    await rehearsalForm.selectCountryAndTimeZone('US');
    await rehearsalForm.ensureVenueSelectEmpty();
    await rehearsalForm.ensureHotelUnchecked();
    await rehearsalForm.ensureFlightUnchecked();
    await rehearsalForm.fillNewVenue(venue, 'US');
    await rehearsalForm.expectMandatoryFieldsFilled(venue);
    await rehearsalForm.saveRehearsal();

    await calendar.goto(month, year);
    await calendar.expectEventMarkerOnDate(isoDate, cityMarker);

    return { isoDate, month, year, day, venueName, cityMarker };
  }
}
