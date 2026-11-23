import type { Page } from '@playwright/test';
import { AddEventPopupPage } from '../pages/add-event-popup.page';
import { CalendarPage } from '../pages/calendar.page';
import { AppearanceEventPage } from '../pages/events/appearance-event.page';
import { uniqueSuffix } from '../utils/unique';

export interface CreateAppearanceEventResult {
  isoDate: string;
  month: number;
  year: number;
  day: number;
  titleMarker: string;
}

/**
 * Calendar → Add Event → Appearance → required fields → SAVE → Calendar verify.
 */
export class CreateAppearanceEventFlow {
  constructor(private readonly page: Page) {}

  /**
   * Same date strategy as existing P0s: next year’s 15 December (unpadded isoDate).
   * Occupied dates are allowed. Calendar lists Appearance by Title, not City.
   */
  async createMinimalAppearanceFromCalendar(): Promise<CreateAppearanceEventResult> {
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
    await addEventPopup.selectEventType('appearance');
    await addEventPopup.confirmAndWaitForOpenerNavigation(
      this.page,
      'route=common/daysheet/appearance',
    );

    const appearanceForm = new AppearanceEventPage(this.page);
    await appearanceForm.expectCreateFormLoaded();
    await appearanceForm.expectDatePrefilled();
    await appearanceForm.fillTime(time);
    await appearanceForm.selectCountryAndTimeZone('US');
    await appearanceForm.fillTitle(titleMarker);
    await appearanceForm.ensureVenueUnchecked();
    await appearanceForm.ensureHotelUnchecked();
    await appearanceForm.expectRequiredFieldsFilled(titleMarker, time);
    await appearanceForm.saveAppearance();

    // Local insert may return a blank 200 instead of redirecting; assert Title on Calendar.
    await calendar.goto(month, year);
    await calendar.expectEventMarkerOnDate(isoDate, titleMarker);

    return { isoDate, month, year, day, titleMarker };
  }
}
