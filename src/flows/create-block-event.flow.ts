import type { Page } from '@playwright/test';
import { AddEventPopupPage } from '../pages/add-event-popup.page';
import { CalendarPage } from '../pages/calendar.page';
import { BlockEventPage } from '../pages/events/block-event.page';
import { uniqueSuffix } from '../utils/unique';

export interface CreateBlockEventResult {
  startIsoDate: string;
  endIsoDate: string;
  month: number;
  year: number;
  titleMarker: string;
}

/**
 * Calendar → Add Event → Block → required fields → SAVE → Calendar verify.
 */
export class CreateBlockEventFlow {
  constructor(private readonly page: Page) {}

  /**
   * Block cannot share a date with any other daysheet, including a previous Block.
   * Other P0s occupy next year’s 15 December, so this P0 uses a two-day range in
   * July of next year, offset so reruns do not hit the same occupied cells.
   * Calendar lists Block by Title. After save, Add (+) becomes blockdateoverridepopup.
   */
  async createMinimalBlockFromCalendar(): Promise<CreateBlockEventResult> {
    const year = new Date().getFullYear() + 1;
    const month = 7;
    const startDay = 2 + (Math.floor(Date.now() / 1000) % 25);
    const endDay = startDay + 1;
    const startIsoDate = `${year}-${month}-${startDay}`;
    const endIsoDate = `${year}-${month}-${endDay}`;
    const endDisplayDate = `${String(month).padStart(2, '0')}/${String(endDay).padStart(2, '0')}/${year}`;
    const titleMarker = `ETE${uniqueSuffix()}`;

    const calendar = new CalendarPage(this.page);
    await calendar.goto(month, year);

    const popup = await calendar.openAddEventPopup(startIsoDate);
    const addEventPopup = new AddEventPopupPage(popup);
    await addEventPopup.expectLoaded();
    await addEventPopup.selectEventType('block');
    // ENTER first GETs checkSingleDateDaysheet; only then does the opener navigate.
    await addEventPopup.confirmAndWaitForOpenerNavigation(
      this.page,
      'route=common/daysheet/block',
    );

    const blockForm = new BlockEventPage(this.page);
    await blockForm.expectCreateFormLoaded();
    await blockForm.expectStartDatePrefilled();
    await blockForm.fillEndDate(endDisplayDate);
    await blockForm.fillTitle(titleMarker);
    await blockForm.ensureHotelUnchecked();
    await blockForm.expectRequiredFieldsFilled(titleMarker, endDisplayDate);
    await blockForm.saveBlock();

    // Local insert may return a blank 200 instead of redirecting; assert Title on both days.
    await calendar.goto(month, year);
    await calendar.expectBlockedEventMarkerOnDate(startIsoDate, titleMarker);
    await calendar.expectBlockedEventMarkerOnDate(endIsoDate, titleMarker);

    return { startIsoDate, endIsoDate, month, year, titleMarker };
  }
}
