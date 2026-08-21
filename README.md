# Tempo Tour Web Automation

Playwright + TypeScript end-to-end automation for the Tempo Tour web application.

The application under test lives in a **separate** repository (`tempo-tour-saas/`). This project must not change that application.

In plain language: these tests open a browser, log in as a real user (once, then reuse the session), and click through the same screens a Super Admin would use.

## Status

- Scaffold, central configuration, and **multi-tenant role-based authentication** (storageState) are in place.
- **P0:** Create a Show from Calendar with the minimum required fields (`local` / `kedemo` / Super Admin).

Not implemented yet: other event types, Hotel/Flight paths, fixtures wrapping every page object, or wider module coverage.

---

## How the code is organised

Think of three layers:

| Layer | What it is | Who reads it |
| --- | --- | --- |
| **Spec** (`tests/`) | The business story: “create a Show with required fields” | Anyone |
| **Flow** (`src/flows/`) | The user journey, step by step | QA / developers |
| **Page object** (`src/pages/`) | Clicks, fills, and waits for one screen | Developers |

The spec should stay short. Locators and AJAX waits belong in page objects.

```text
tempo-tour-web-automation/
├── auth/                 # Generated login cookies (JSON is gitignored)
├── config/               # Env, tenants, roles, routes, timeouts
├── src/
│   ├── pages/
│   │   ├── login.page.ts
│   │   ├── calendar.page.ts
│   │   ├── add-event-popup.page.ts
│   │   └── events/show-event.page.ts
│   ├── flows/
│   │   └── create-show-event.flow.ts
│   └── utils/
│       ├── unique.ts     # Letters-only markers (City cannot contain digits)
│       ├── load-env.ts
│       └── credentials.ts
└── tests/
    ├── auth.setup.ts
    └── smoke/
        ├── authenticated-session-reuse.spec.ts
        └── create-show-event.spec.ts
```

---

## P0: Create Show from Calendar

### What it proves

A Super Admin can:

1. Open Calendar for a chosen month
2. Pick a date and click Add (+)
3. In the Add Event popup, choose **Show** and press **ENTER**
4. Fill the required Show fields
5. Click **SAVE**
6. See the new event on that date on Calendar

The test does **not** log in through the UI. It reuses `auth/local/kedemo/super-admin.json`.

### Required fields (confirmed in the product)

- Date (pre-filled from the Calendar date)
- Country
- Time Zone
- Venue Name
- City
- State
- Venue Type (`#venuetype`)

Hotel Name is required **only** when the Hotel checkbox is on. This P0 leaves Hotel and Flight **unchecked**.

The venue is created by typing Name / City / State / Type. **Select Venue** stays on `--Please Select--`.

Other events already on the same date are allowed. The test does not need an empty day.

### Date used

Next year’s **15 December**, built as `YYYY-M-D` without zero-padding so it matches the Calendar’s `addeventpopup('…')` handler. The date is not hardcoded to a calendar year and is not “today”.

### Unique marker

Each run uses a unique **letters-only** city (prefix `ETE`, not `E2E`). The City field strips digits on blur, so `E2E` would be saved as `EE` and fail validation.

Success is: that city text appears in the Calendar cell for the chosen date. There is **no** reliable success toast.

### Local SAVE behaviour

After SAVE, the local app may:

- Take several seconds (server-side work after insert)
- Return HTTP 200 with an empty page instead of redirecting to Calendar

The test waits for the insert POST to finish, then **opens Calendar for that month itself** and checks the marker. It does not treat a toast or a redirect as the only success signal.

### Country / Time Zone / State

Changing Country reloads Time Zone options (AJAX `getTimeZone_`). For US/Canada, State is a dropdown loaded by `common/state/get`. For other countries, State is a text field (`#state1`).

State is selected **last**, after those requests finish. Selecting State earlier can be wiped when the dropdown HTML is rebuilt.

### How to run it

Prerequisites: local Tempo Tour (Docker) up, Chromium installed, Super Admin storageState present (`npm run auth:setup` if missing).

```bash
npx playwright test tests/smoke/create-show-event.spec.ts --reporter=list
npx tsc --noEmit
```

Or: `npm run test:smoke` (runs all `@smoke` tests on the chromium project).

---

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Local Tempo Tour app running (Docker) when generating **local** auth state or running local tests

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env.local
```

Fill credentials in `.env.local`. Never commit secrets.

## Authentication

Flow:

```text
credentials (.env.local / CI secrets)
  → UI login (common/login)
  → PHP session cookies
  → auth/{env}/{tenant}/{role}.json  (storageState)
  → reusable authenticated Playwright runs
```

### Generate auth state

```bash
# Uses TEST_ENV (default: local). Skips any tenant/role missing credentials.
npm run auth:setup
```

Initial setup roles (both tenants):

- Super Admin (`super-admin`)
- Admin (`admin`)
- Band (`band`)

Crew, Travel Agent, and Driver remain in config for later — not part of auth setup yet.

### Where state is stored

```text
auth/
├── local/
│   ├── kedemo/{super-admin,admin,band}.json
│   └── ketest/{super-admin,admin,band}.json
└── staging/
    ├── kedemo/...
    └── ketest/...
```

All `auth/**/*.json` files are gitignored. Directory placeholders use `.gitkeep`.

### Runtime selection

| Variable | Values | Default |
|----------|--------|---------|
| `TEST_ENV` | `local`, `staging` | `local` |
| `TEST_TENANT` | `kedemo`, `ketest` | `kedemo` |
| `TEST_ROLE` | `super-admin`, `admin`, `band`, … | `super-admin` |

`playwright.config.ts` sets `baseURL` from that context and attaches `storageState` when the matching file exists.

### Required credential env vars (initial)

```text
KEDEMO_SUPER_ADMIN_USERNAME / KEDEMO_SUPER_ADMIN_PASSWORD
KEDEMO_ADMIN_USERNAME / KEDEMO_ADMIN_PASSWORD
KEDEMO_BAND_USERNAME / KEDEMO_BAND_PASSWORD
KETEST_SUPER_ADMIN_USERNAME / KETEST_SUPER_ADMIN_PASSWORD
KETEST_ADMIN_USERNAME / KETEST_ADMIN_PASSWORD
KETEST_BAND_USERNAME / KETEST_BAND_PASSWORD
```

Staging uses the **same variable names**; switch targets with `TEST_ENV=staging`. Staging credentials are optional for local install.

### Secrets protection

- Never commit `.env`, `.env.local`, or `auth/**/*.json`
- Never hardcode usernames/passwords in source
- CI should inject secrets as environment variables

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run auth:setup` | Generate storageState for available credentials |
| `npm test` | Run chromium project tests |
| `npm run test:smoke` | Run `@smoke` tests |
| `npm run test:headed` | Headed chromium |
| `npm run test:ui` | Playwright UI mode |
| `npm run test:debug` | Debug mode |
| `npm run report` | Open HTML report |
| `npm run codegen` | Codegen helper |

## Safety

- Do not modify `tempo-tour-saas/`.
- Do not commit secrets or storageState files.
- Prefer stable locators (ids, names, labels) over brittle XPath.

## Next steps (planned)

1. Authenticated fixtures wrapping `resolveAppContext()` + storageState
2. Additional event types (Travel, Day Off, …) reusing Calendar + Add Event popup
3. Broader smoke coverage (guest list, permissions)
