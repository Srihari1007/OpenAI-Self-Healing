# AI Resolution Report

## TC05 - Synchronization Issue

**Failure Type:** Synchronization Issue

**Root Cause:** The demo delays the Products heading for 2.5 seconds, but the initial automation waits only 1.5 seconds.

**Recommended Fix:** Use Playwright's normal condition-based web assertion timeout.

**Recovery Guardrail:** SAFE AUTOMATION FIX

**Exact file and method:** `src/pages/inventory.page.ts`, `expectDashboardTooEarly()`.

```diff
- await expect(this.title).toBeVisible({ timeout: 1500 });
+ await expect(this.title).toBeVisible();
```

**Action:** Activate the allow-listed synchronization remediation and rerun TC05.

**Rerun:** Only TC05 will be selected in the recovery phase.

## TC06 - Locator Change

**Failure Type:** Automation Framework Issue

**Root Cause:** The application locator changed and the old test id no longer exists.

**Recovery Guardrail:** SAFE AUTOMATION FIX

**Exact file and method:** `src/pages/login.page.ts`, `fillBrokenUsernameLocator()`.

```diff
- await this.page.getByTestId('missing-username').fill(username, { timeout: 1500 });
+ await this.usernameInput.fill(username);
```

**Action:** Activate the allow-listed stable locator and rerun TC06.

**Rerun:** Only TC06 will be selected in the recovery phase.

## TC08 - Locator Drift

**Failure Type:** Locator Drift

**Root Cause:** The payment control exists with test id `payment-service`, but the initial automation uses obsolete test id `missing-payment-service`.

**Exact file and line:** `tests/pipeline-demo.spec.ts`, TC08 payment control locator.

**Code change:** Replace `page.getByTestId('missing-payment-service')` with `page.locator('[data-test="payment-service"]')`.

**Recovery Guardrail:** SAFE AUTOMATION FIX

**Action:** Activate the allow-listed locator remediation and rerun TC08.

**Rerun:** Only TC08 will be selected in the recovery phase.

## TC10 - Genuine Application Defect

**Failure Type:** Application Server Error

**Root Cause:** The application server returned 100 instead of applying the SAVE20 discount and returning 80.

**Exact file and assertion:** `tests/pipeline-demo.spec.ts`, TC10 coupon total assertion.

**Code change:** No automation code change. Keep `expectedTotal = 80` and investigate the application pricing calculation that returned `100`.

**Recovery Guardrail:** APPLICATION FIX REQUIRED

**Action:** Raise a developer bug, require the application server fix, then rerun TC10 without weakening the expected value.

**Rerun:** Only TC10 will be selected in the recovery phase.

## Release decision

**INITIAL RUN FAILED:** Three failures have operational or automation recovery paths. TC10 requires an application fix before its rerun can pass.
