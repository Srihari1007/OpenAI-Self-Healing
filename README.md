# Playwright POM Automation Framework

A TypeScript Playwright Test framework using the Page Object Model (POM). The sample suite targets [Sauce Demo](https://www.saucedemo.com) and demonstrates positive and negative authentication coverage.

## Prerequisites

- Node.js 22 or newer
- npm

## Setup

```bash
npm install
npx playwright install
```

Copy `.env.example` to `.env` when you need to override `BASE_URL`. Do not commit credentials or environment secrets.

## Commands

```bash
npm test              # Run all browser projects
npm run test:smoke    # Run tests tagged @smoke
npm run test:headed   # Run with a visible browser
npm run test:ui       # Open Playwright UI mode
npm run test:debug    # Run with the Playwright debugger
npm run typecheck     # Validate TypeScript
npm run lint          # Run ESLint
npm run report        # Open the last HTML report
npm run demo:pipeline # Open Chromium and run all 10 POM test cases
npm run demo:self-heal # Detect failures, show AI resolution, and rerun failed tests
npm run self-heal:agent # Apply approved remediations and rerun affected tests

## Ten-test hackathon pipeline demo

The recommended presentation command is:

```bash
npm run demo:pipeline
```

This opens Chromium and runs ten POM test cases sequentially. Six pass and four fail intentionally. Failed tests automatically create screenshots in `screenshots/` using their test IDs.

Before every `npm run demo:pipeline` run, the npm pre-script restores the intentional TC05, TC06, and TC08 failure baseline. This keeps the presentation repeatable even after `npm run self-heal:agent` has applied its approved repairs.

| Tests | Result | Reason |
| --- | --- | --- |
| TC01-TC04 | Pass | Login, products, cart, and invalid-login behavior |
| TC05 | Fail | Synchronization/order issue |
| TC06 | Fail | Locator drift |
| TC07 | Pass | Missing test data recovered through approved setup |
| TC08 | Fail | Payment control locator drift |
| TC09 | Pass | Checkout navigation |
| TC10 | Fail | Genuine coupon application defect |

The reports are saved to `artifacts/defect-report.md` and `artifacts/ai-resolution.md`. Show the browser first, then open the defect report and screenshots. Explain that TC05, TC06, and TC08 are self-healing candidates, TC07 demonstrates recovered test-data setup, and TC10 must be escalated because the application server is producing the wrong business result. The initial state is **6 passed and 4 failed**.

After the pipeline run, execute `npm run self-heal:agent`. It repairs and reruns TC05, TC06, and TC08, reruns TC10 without weakening its assertion, and reports **3 recovered with 1 application defect still open**.

## Self-healing hackathon demo

Run the complete two-stage presentation with:

```bash
npm run demo:self-heal
```

The command runs the initial suite, detects the failed test IDs from Playwright's JSON output, generates and opens `artifacts/ai-resolution.md`, and reruns only those failures with allow-listed remediations. The final result is written to `artifacts/healing-summary.md`.

When `OPENAI_API_KEY` is set, failure classification uses the OpenAI Responses API with Structured Outputs. Without a key, the same pipeline uses a deterministic offline fallback so the presentation remains runnable. Use `DEMO_OPEN_REPORT=0` to suppress opening the Markdown file or `DEMO_REVIEW_SECONDS=15` to change the review pause.

## Structure

- `tests/`: business-focused test specifications
- `src/pages/`: page objects containing locators and user actions
- `playwright.config.ts`: projects, environments, retries, reporting, and diagnostics
- `.github/workflows/playwright.yml`: CI execution and artifact retention

## POM conventions

Tests describe business behavior and assertions. Page objects own locators and reusable interactions. Prefer accessible, user-facing locators and Playwright web assertions. Avoid fixed waits, test-order dependencies, and selectors coupled to presentation CSS.

## CI

CI runs type checking, linting, and the full browser matrix. On failure, traces, screenshots, videos, HTML reports, and JUnit results are retained as workflow artifacts.
