import type { Page } from '@playwright/test';
import { AddEventPopupPage } from '../pages/add-event-popup.page';
import { CalendarPage } from '../pages/calendar.page';
import { MiscellaneousEventPage } from '../pages/events/miscellaneous-event.page';
import { uniqueSuffix } from '../utils/unique';

export interface CreateMiscellaneousEventResult {
  isoDate: string;
  month: number;
  year: number;
  day: number;
  titleMarker: string;
}

/**
 * Calendar → Add Event → Miscellaneous → required fields → SAVE → Calendar verify.
 */
export class CreateMiscellaneousEventFlow {
  constructor(private readonly page: Page) {}

  /**
   * Same date strategy as existing P0s: next year’s 15 December (unpadded isoDate).
   * Occupied dates are allowed. Calendar lists Miscellaneous by Title, not City.
   */
  async createMinimalMiscellaneousFromCalendar(): Promise<CreateMiscellaneousEventResult> {
    const year = new Date().getFullYear() + 1;
    const month = 12;
    const day = 15;
    const isoDate = `${year}-${month}-${day}`;
    const titleMarker = `ETE${uniqueSuffix()}`;
    const time = '8:00';

    const calendar = new CalendarPage(this.page);
    await calendar.goto(month, year);

    const popup = await calendar.openAddEventPopup(isoDate);
    const addEventPopup = new AddEventPopupPage(popup);
    await addEventPopup.expectLoaded();
    await addEventPopup.selectEventType('miscellaneous');
    await addEventPopup.confirmAndWaitForOpenerNavigation(
      this.page,
      'route=common/daysheet/miscellaneous',
    );

    const miscForm = new MiscellaneousEventPage(this.page);
    await miscForm.expectCreateFormLoaded();
    await miscForm.expectDatePrefilled();
    await miscForm.fillTime(time);
    await miscForm.selectCountryAndTimeZone('US');
    await miscForm.fillTitle(titleMarker);
    await miscForm.ensureHotelUnchecked();
    await miscForm.expectRequiredFieldsFilled(titleMarker, time);
    await miscForm.saveMiscellaneous();

    // Local insert may return a blank 200 instead of redirecting; assert Title on Calendar.
    await calendar.goto(month, year);
    await calendar.expectEventMarkerOnDate(isoDate, titleMarker);

    return { isoDate, month, year, day, titleMarker };
  }
}
