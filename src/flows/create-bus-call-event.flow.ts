import type { Page } from '@playwright/test';
import { AddEventPopupPage } from '../pages/add-event-popup.page';
import { CalendarPage } from '../pages/calendar.page';
import { BusCallEventPage } from '../pages/events/bus-call-event.page';
import { uniqueSuffix } from '../utils/unique';

export interface CreateBusCallEventResult {
  isoDate: string;
  month: number;
  year: number;
  day: number;
  titleMarker: string;
}

/**
 * Calendar → Add Event → Bus Call → Crew required fields → SAVE → Calendar verify.
 * Band is left empty (smallest valid P0). Calendar lists Bus Call as `{title} bus`.
 */
export class CreateBusCallEventFlow {
  constructor(private readonly page: Page) {}

  async createMinimalBusCallFromCalendar(): Promise<CreateBusCallEventResult> {
    const year = new Date().getFullYear() + 1;
    const month = 12;
    const day = 15;
    const isoDate = `${year}-${month}-${day}`;
    const displayDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    const titleMarker = `ETE${uniqueSuffix()}`;
    const time = '8:00';

    const calendar = new CalendarPage(this.page);
    await calendar.goto(month, year);

    const popup = await calendar.openAddEventPopup(isoDate);
    const addEventPopup = new AddEventPopupPage(popup);
    await addEventPopup.expectLoaded();
    await addEventPopup.selectEventType('buscall');
    await addEventPopup.confirmAndWaitForOpenerNavigation(
      this.page,
      'route=common/daysheet/buscall',
    );

    const busCallForm = new BusCallEventPage(this.page);
    await busCallForm.expectCreateFormLoaded();
    await busCallForm.fillCrewDate(displayDate);
    await busCallForm.fillCrewTime(time);
    await busCallForm.selectCrewMeridiem('PM');
    await busCallForm.selectCrewCountryAndTimeZone('US');
    await busCallForm.fillCrewTitle(titleMarker);
    await busCallForm.ensureHotelUnchecked();
    await busCallForm.expectRequiredFieldsFilled(titleMarker, time);
    await busCallForm.saveBusCall();

    // Local insert may return a blank 200; redirecturl is not set from Calendar.
    await calendar.goto(month, year);
    await calendar.expectEventMarkerOnDate(isoDate, titleMarker);

    return { isoDate, month, year, day, titleMarker };
  }
}
