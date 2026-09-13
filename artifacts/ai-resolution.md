# AI Resolution Report

## TC05 - Synchronization Issue

**Failure Type:** Synchronization Issue

**Root Cause:** The demo delays the Products heading for 2.5 seconds, but the initial automation waits only 1.5 seconds.

**Recommended Fix:** Use Playwright's normal condition-based web assertion timeout.

**Exact file and method:** `src/pages/inventory.page.ts`, `expectDashboardTooEarly()`.

```diff
- await expect(this.title).toBeVisible({ timeout: 1500 });
+ await expect(this.title).toBeVisible();
```

**Action:** Activate the allow-listed synchronization remediation and rerun TC05.

## TC06 - Locator Change

**Failure Type:** Automation Framework Issue

**Root Cause:** The application locator changed and the old test id no longer exists.

**Exact file and method:** `src/pages/login.page.ts`, `fillBrokenUsernameLocator()`.

```diff
- await this.page.getByTestId('missing-username').fill(username, { timeout: 1500 });
+ await this.usernameInput.fill(username);
```

**Action:** Activate the allow-listed stable locator and rerun TC06.

## TC08 - Transient Infrastructure Failure

**Failure Type:** Infrastructure Failure

**Root Cause:** Payment service returned HTTP 503 Service Unavailable.

**Exact file and line:** `tests/pipeline-demo.spec.ts`, TC08 payment response assertion.

**Code change:** No page-object or test-code change. Keep the assertion unchanged and retry the request through the pipeline recovery policy.

**Action:** Retry the affected test after the simulated service recovery and escalate if it remains unavailable.

## TC10 - Genuine Application Defect

**Failure Type:** Application Defect

**Root Cause:** The coupon was accepted but the checkout total was not reduced from 100 to 80.

**Exact file and assertion:** `tests/pipeline-demo.spec.ts`, TC10 coupon total assertion.

**Code change:** No automation code change. Keep `expectedTotal = 80` and investigate the application pricing calculation that returned `100`.

**Action:** Require the simulated application fix, then rerun TC10 without weakening the expected value.

## Release decision

**INITIAL RUN FAILED:** Three failures have operational or automation recovery paths. TC10 requires an application fix before its rerun can pass.
