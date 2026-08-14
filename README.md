# Tempo Tour Web Automation

Playwright + TypeScript end-to-end automation framework for the Tempo Tour web application.

The application under test lives in a **separate** repository (`tempo-tour-saas/`) and must not be modified by this project.

## Status

Scaffold, central configuration, and **multi-tenant role-based authentication setup** are in place.

Not implemented yet: business test cases, module page objects (beyond Login), or fixtures.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Local Tempo Tour app running (Docker) when generating **local** auth state

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

## Folder structure

```text
tempo-tour-web-automation/
├── auth/           # Generated storageState (JSON gitignored)
├── config/         # Env, tenants, roles, routes, timeouts, auth paths
├── src/
│   ├── pages/      # LoginPage (auth); more page objects later
│   ├── utils/      # load-env, credentials helpers
│   └── ...
└── tests/
    └── auth.setup.ts
```

## Safety

- Do not modify `tempo-tour-saas/`.
- Do not commit secrets or storageState files.
- Prefer stable locators (`#username`, `#password`, submit `LOGIN`) over brittle XPath.

## Next steps (planned)

1. Authenticated fixtures wrapping `resolveAppContext()` + storageState
2. Base page + calendar / events page objects
3. MVP smoke coverage (calendar, events, guest list)
