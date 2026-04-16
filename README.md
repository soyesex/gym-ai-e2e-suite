# gym-ai-e2e-suite

[![Playwright Tests](https://github.com/soyesex/gym-ai-e2e-suite/actions/workflows/playwright.yml/badge.svg)](https://github.com/soyesex/gym-ai-e2e-suite/actions/workflows/playwright.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Professional end-to-end, API and performance test automation suite for **GYM-AI**, built with Playwright and TypeScript. The suite runs against an isolated local environment — never against production — and is fully integrated with GitHub Actions for continuous testing.

This repository is developed as a portfolio project to showcase test automation skills: architecture design, TDD mindset, CI/CD integration, and maintainable test code.

## Tech stack

| Layer | Tool |
|---|---|
| Test runner | Playwright |
| Language | TypeScript |
| Linting & formatting | ESLint, Prettier |
| CI/CD | GitHub Actions |
| Local backend | Supabase CLI (Docker) |
| Application under test | Next.js + Supabase + Gemini API |

## Scope

The suite covers three layers of testing:

- **End-to-end** — real user flows through the UI (authentication, workout plan generation, etc.).
- **API** — direct validation of Next.js API routes and Supabase endpoints, with schema validation.
- **Performance** — page load and Core Web Vitals checks via Lighthouse CI.

External dependencies such as the Gemini API are mocked at the network level with Playwright's `page.route()` to keep tests deterministic and avoid consuming free-tier quotas in CI.

## Project structure

```
tests/
  e2e/            User flow tests
  api/            API contract and integration tests
  performance/    Lighthouse and Web Vitals checks
fixtures/         Custom Playwright fixtures (auth, seed data)
pages/            Page Object Model
utils/            Helpers and test factories
.github/workflows/  CI pipelines
```

> Note: this structure is built incrementally as the suite grows. Not all folders exist yet.

## Getting started

### Prerequisites

- Node.js 20 or higher
- npm
- Docker Desktop (for the local Supabase instance)
- Supabase CLI

### Installation

```bash
git clone https://github.com/soyesex/gym-ai-e2e-suite.git
cd gym-ai-e2e-suite
npm install
npx playwright install
```

### Environment variables

Copy the example file and fill in the values for your local environment:

```bash
cp .env.example .env.test
```

Never commit `.env.test` — it is ignored by git.

### Running the tests

```bash
npx playwright test                    # run the full suite
npx playwright test --ui               # interactive UI mode
npx playwright test tests/e2e          # run a specific folder
npx playwright show-report             # open the last HTML report
```

## Testing strategy

The suite deliberately targets an **isolated environment**, never production:

- Supabase runs locally via `supabase start` (Docker-backed), using the same schema as production through migrations.
- The Next.js application runs locally with test-specific environment variables pointing at the local Supabase instance.
- External APIs (Gemini) are intercepted and mocked at the network layer.

This guarantees deterministic runs, no risk to real user data, and zero external-service cost in CI.

## Continuous integration

Every push and pull request triggers the Playwright workflow defined in `.github/workflows/playwright.yml`. The workflow installs dependencies, runs the test suite, and uploads the HTML report and traces as build artifacts on failure.

## Roadmap

- [x] Project bootstrap (Playwright + TypeScript + ESLint)
- [x] GitHub Actions workflow running on every push
- [ ] Local Supabase environment with schema migrations
- [ ] Page Object Model and authentication fixture
- [ ] First real end-to-end user flow
- [ ] API test suite with schema validation (zod)
- [ ] Gemini API mocking layer
- [ ] Lighthouse CI performance checks
- [ ] Full Dockerized test environment

## License

Released under the [MIT License](./LICENSE).