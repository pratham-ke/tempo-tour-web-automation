import type { Page } from '@playwright/test';
import { AddEventPopupPage } from '../pages/add-event-popup.page';
import { CalendarPage } from '../pages/calendar.page';
import { TravelEventPage } from '../pages/events/travel-event.page';
import { uniqueSuffix } from '../utils/unique';

export interface CreateTravelEventResult {
  isoDate: string;
  month: number;
  year: number;
  day: number;
  titleMarker: string;
}

/**
 * Calendar → Add Event → Travel → required fields → SAVE → Calendar verify.
 */
export class CreateTravelEventFlow {
  constructor(private readonly page: Page) {}

  /**
   * Same date strategy as Show / Day Off P0: next year’s 15 December (unpadded isoDate).
   * Occupied dates are allowed. Calendar lists Travel by Title, not City.
   */
  async createMinimalTravelFromCalendar(): Promise<CreateTravelEventResult> {
    const year = new Date().getFullYear() + 1;
    const month = 12;
    const day = 15;
    const isoDate = `${year}-${month}-${day}`;
    const titleMarker = `ETE${uniqueSuffix()}`;

    const calendar = new CalendarPage(this.page);
    await calendar.goto(month, year);

    const popup = await calendar.openAddEventPopup(isoDate);
    const addEventPopup = new AddEventPopupPage(popup);
    await addEventPopup.expectLoaded();
    await addEventPopup.selectEventType('travel');
    await addEventPopup.confirmAndWaitForOpenerNavigation(
      this.page,
      'route=common/daysheet/travel',
    );

    const travelForm = new TravelEventPage(this.page);
    await travelForm.expectCreateFormLoaded();
    await travelForm.expectDatePrefilled();
    await travelForm.selectCountryAndTimeZone('US');
    await travelForm.fillTitle(titleMarker);
    await travelForm.ensureHotelUnchecked();
    await travelForm.ensureTravelUsersUnchecked();
    await travelForm.expectRequiredFieldsFilled(titleMarker);
    await travelForm.saveTravel();

    // Local insert may not redirect; open the month and assert the unique Title.
    await calendar.goto(month, year);
    await calendar.expectEventMarkerOnDate(isoDate, titleMarker);

    return { isoDate, month, year, day, titleMarker };
  }
}
