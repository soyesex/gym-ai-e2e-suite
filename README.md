# gym-ai-e2e-suite

[![Playwright Tests](https://github.com/soyesex/gym-ai-e2e-suite/actions/workflows/playwright.yml/badge.svg)](https://github.com/soyesex/gym-ai-e2e-suite/actions/workflows/playwright.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Playwright + TypeScript test suite for [GYM-AI](https://github.com/soyesex/gym-ai) — a Next.js 15 / Supabase / Gemini AI fitness app. Covers API contracts, authenticated E2E flows, and auth edge cases across three isolated Playwright projects. Runs against a local Supabase instance, never against production.

---

## Why this exists

Most portfolio automation projects test a TODO app or a demo site with no backend worth speaking of. This one runs against a real, full-stack application with Supabase Auth, RLS policies, i18n, a multi-step onboarding wizard, and AI-generated workout plans. The app changes; the tests have to keep up.

The goal is to build a suite that's defensible in an interview — not just "tests pass in CI" but "here's why the architecture is structured this way and what would break if you changed it."

---

## Application under test

**GYM-AI** (`../gym-ai/gym-app`): Next.js 15 App Router, Supabase (Auth + Postgres + pgvector), Gemini 2.5 Flash, bilingual (ES/EN). The suite treats the app as a black box — it hits HTTP endpoints and browser UI exactly as a real user or client would. No imports from the app source.

---

## Architecture decisions

**storageState via API, not UI login**
The global setup creates a test user through the Supabase Admin API, then logs in with the anon client and writes cookies + localStorage to `playwright/.auth/user.json`. Authenticated tests load that file directly. UI login is only exercised in the explicit `login.e2e.spec.ts`. This keeps the suite fast and prevents a broken login page from failing unrelated tests.

**Fixtures, not `beforeEach`**
Every resource — Supabase admin client, test user, page objects — is injected through a custom `test` export in `src/fixtures/base.ts`. Fixtures handle both setup and teardown in the same function, so cleanup is guaranteed even when a test fails midway. `beforeEach` with mutable state makes teardown fragile.

**One user per test, created via `service_role`**
The `testUser` fixture calls `supabaseAdmin.auth.admin.createUser()` with `email_confirm: true` and deletes the user in teardown. Every test gets a fresh, isolated identity. No shared accounts, no cross-test state.

**Separate test repo**
The suite lives in its own repository and never imports from the app source. This enforces the contract: if the test needs internal knowledge to pass, it's testing the wrong thing. It also means CI can clone the two repos independently and the suite can be pointed at any environment.

**Local Supabase via Docker**
`supabase start` spins up a full Supabase stack (Postgres, Auth, Storage, Studio) locally. Tests run against `http://localhost:54321`, not the production project. Schema is kept in sync through migrations. Prod credentials never touch the test environment.

**Env validation at startup**
`src/config/env.ts` parses all required variables through a Zod schema before any test runs. If `SUPABASE_SERVICE_ROLE_KEY` is missing, you get a clear error immediately — not a cryptic auth failure halfway through the suite.

**70 / 20 / 10 layer split**
API tests are cheap and fast; they should cover the bulk of contract validation. E2E UI tests are reserved for flows that can only be validated end-to-end (e.g., the onboarding wizard with its sliders and multi-step state). AI/visual layers come later, after the foundation is solid.

---

## Project structure

```
src/
  config/env.ts                  # Zod env validation — fails fast on missing vars
  fixtures/base.ts               # custom test export: supabaseAdmin + testUser
  builders/user.builder.ts       # Faker-based factory, UUID-stamped emails
  helpers/auth.helper.ts         # API login → writes storageState to disk
  pages/
    base.page.ts
    auth/login.page.ts
    onboarding/onboarding.page.ts

tests/
  global.setup.ts                # creates test user + storageState (runs once)
  api/
    health.api.spec.ts
    auth.api.spec.ts
  e2e/
    auth/
      smoke.e2e.spec.ts          # landing page smoke test (anon)
      login.e2e.spec.ts          # page load + redirect to onboarding
    authenticated/
      onboarding.e2e.spec.ts     # full 7-step wizard → dashboard

.github/workflows/playwright.yml  # manual trigger (workflow_dispatch) for now
playwright.config.ts              # 4 projects: setup, api, e2e-anon, e2e-authenticated
```

---

## Test coverage (8 passing)

| File | Tests | What it verifies |
|---|---|---|
| `api/health.api.spec.ts` | 1 | `GET /` returns 200 |
| `api/auth.api.spec.ts` | 2 | user creation via Admin API; password login returns a session |
| `e2e/auth/smoke.e2e.spec.ts` | 1 | landing page renders hero heading and login link |
| `e2e/auth/login.e2e.spec.ts` | 2 | login page loads; successful login redirects to `/onboarding` |
| `e2e/authenticated/onboarding.e2e.spec.ts` | 1 | completes all 7 wizard steps (name, goal, level, equipment, weight/height) and lands on dashboard |
| `global.setup.ts` | 1 | creates auth user + writes `playwright/.auth/user.json` |

---

## Getting started

### Prerequisites

- Node.js 20+
- Docker Desktop (running)
- Supabase CLI (`npm i -g supabase` or [official install](https://supabase.com/docs/guides/cli))
- GYM-AI app cloned at `../gym-ai/gym-app` relative to this repo

### Install

```bash
git clone https://github.com/soyesex/gym-ai-e2e-suite.git
cd gym-ai-e2e-suite
npm install
npx playwright install chromium
```

### Environment

```bash
cp .env.example .env
```

Fill in the values for your local Supabase instance. After running `supabase start`, the CLI prints the `API URL`, `anon key`, and `service_role key` — those go in `.env`. Never commit `.env`.

Required variables:

```
BASE_URL=http://localhost:3000
SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service_role key>
```

### Start the local backend and app

```bash
# From the gym-ai repo
supabase start

# Start the Next.js app (Playwright will do this automatically via webServer config,
# but you can also start it manually)
cd ../gym-ai/gym-app && npm run dev
```

---

## Running tests

```bash
# Full suite (all 4 projects)
npx playwright test

# Specific project
npx playwright test --project=api
npx playwright test --project=e2e-authenticated

# Specific file
npx playwright test tests/e2e/authenticated/onboarding.e2e.spec.ts

# Interactive UI mode
npx playwright test --ui

# Open last HTML report
npx playwright show-report
```

---

## CI

The workflow at `.github/workflows/playwright.yml` is configured with `workflow_dispatch` (manual trigger). It will move to `pull_request` + `push` once the environment setup in CI is locked in. The local `webServer` config in `playwright.config.ts` starts Next.js automatically for local runs.

---

## Roadmap

**Foundation**
- [x] Playwright + TypeScript + ESLint + Prettier
- [x] Zod env validation at startup
- [x] Faker-based user builder with UUID-stamped emails
- [x] Custom fixtures: `supabaseAdmin` + `testUser` with teardown
- [x] `auth.helper.ts` — API login → storageState
- [x] 3-project Playwright config: `api`, `e2e-anon`, `e2e-authenticated`
- [x] GitHub Actions workflow (manual trigger)

**Test coverage**
- [x] API: health check, signup, login
- [x] E2E: landing page smoke, login flow, full onboarding wizard
- [ ] API: workout plan creation and DB persistence verification
- [ ] E2E: AI plan generation flow (with mocked Gemini response)
- [ ] E2E: live workout session

**Infrastructure**
- [ ] Gemini API mocking layer (`page.route`) for UI tests that aren't testing AI
- [ ] DB assertion in onboarding test (profile persistence via `supabaseAdmin`)
- [ ] CI: switch workflow trigger to `pull_request` + `push: [main]`
- [ ] Visual / accessibility smoke (`@axe-core/playwright`)
- [ ] Sharding when suite grows past ~30 tests

---

## License

Released under the [MIT License](./LICENSE).
