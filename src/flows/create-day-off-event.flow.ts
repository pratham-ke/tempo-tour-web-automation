import type { Page } from '@playwright/test';
import { AddEventPopupPage } from '../pages/add-event-popup.page';
import { CalendarPage } from '../pages/calendar.page';
import { DayOffEventPage } from '../pages/events/day-off-event.page';
import { uniqueSuffix } from '../utils/unique';

export interface CreateDayOffEventResult {
  isoDate: string;
  month: number;
  year: number;
  day: number;
  cityMarker: string;
}

/**
 * Calendar → Add Event → Day Off → required fields → SAVE → Calendar verify.
 */
export class CreateDayOffEventFlow {
  constructor(private readonly page: Page) {}

  /**
   * Same date strategy as Show P0: next year’s 15 December (unpadded isoDate).
   * Occupied dates are allowed. City is letters-only (alpha_space).
   */
  async createMinimalDayOffFromCalendar(): Promise<CreateDayOffEventResult> {
    const year = new Date().getFullYear() + 1;
    const month = 12;
    const day = 15;
    const isoDate = `${year}-${month}-${day}`;
    const cityMarker = `ETE${uniqueSuffix()}`;

    const calendar = new CalendarPage(this.page);
    await calendar.goto(month, year);

    const popup = await calendar.openAddEventPopup(isoDate);
    const addEventPopup = new AddEventPopupPage(popup);
    await addEventPopup.expectLoaded();
    await addEventPopup.selectEventType('dayoff');
    await addEventPopup.confirmAndWaitForOpenerNavigation(
      this.page,
      'route=common/daysheet/dayoff',
    );

    const dayOffForm = new DayOffEventPage(this.page);
    await dayOffForm.expectCreateFormLoaded();
    await dayOffForm.expectDatePrefilled();
    await dayOffForm.selectCountryAndTimeZone('US');
    await dayOffForm.fillCity(cityMarker);
    await dayOffForm.ensureHotelUnchecked();
    await dayOffForm.expectRequiredFieldsFilled(cityMarker);
    await dayOffForm.saveDayOff();

    // Local insert may not redirect; open the month and assert the unique city.
    await calendar.goto(month, year);
    await calendar.expectEventMarkerOnDate(isoDate, cityMarker);

    return { isoDate, month, year, day, cityMarker };
  }
}
