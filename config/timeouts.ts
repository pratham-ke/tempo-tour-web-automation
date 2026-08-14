/**
 * Central Playwright timeout defaults (milliseconds).
 * Import these from playwright.config.ts and future helpers — do not scatter magic numbers.
 */
export const timeouts = {
  /** Default per-test timeout */
  test: 60_000,
  /** expect() assertions */
  expect: 15_000,
  /** Individual actions (click, fill, etc.) */
  action: 15_000,
  /** Navigations / goto */
  navigation: 30_000,
  /**
   * Heavier legacy screens (large daysheet forms).
   * Use selectively in page objects/flows later — not as a global default.
   */
  heavyPage: 90_000,
} as const;

export type TimeoutKey = keyof typeof timeouts;
