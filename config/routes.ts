/**
 * Common tenant-app query-string routes.
 * Usage: buildRoute(routes.calendar) → index.php?route=common/calendar
 *
 * Portal routes are intentionally excluded — portal is a separate surface.
 */
export const routes = {
  login: 'common/login',
  logout: 'common/logout',
  forgotPassword: 'common/login/recover',
  calendar: 'common/calendar',
  account: 'common/account',
  allEvents: 'common/daysheet/manage',
  showEvent: 'common/daysheet/show',
  blockEvent: 'common/daysheet/block',
  travelEvent: 'common/daysheet/travel',
  dayOffEvent: 'common/daysheet/dayoff',
  appearanceEvent: 'common/daysheet/appearance',
  busCallEvent: 'common/daysheet/buscall',
  miscellaneousEvent: 'common/daysheet/miscellaneous',
  guestListRequest: 'common/guestlist',
  guestListManage: 'common/guestlist/manage',
  guestListApprove: 'common/guestlist/approve',
  usersManage: 'common/user/manage',
  rolesManage: 'common/role/manage',
  hotelsManage: 'common/hotel/manage',
  hotelReservationsManage: 'common/hotelreservation/manage',
  venuesManage: 'common/venue/manage',
  documentsManage: 'common/document/manage',
  permissionError: 'error/permission',
} as const;

export type RouteKey = keyof typeof routes;
export type RoutePath = (typeof routes)[RouteKey];

/**
 * Build a tenant-app relative URL for Playwright page.goto / baseURL resolution.
 * Route path keeps literal slashes (app links use route=common/calendar, not %2F).
 */
export function buildRoute(
  route: RoutePath | string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const search = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query
    ? `index.php?route=${route}&${query}`
    : `index.php?route=${route}`;
}
