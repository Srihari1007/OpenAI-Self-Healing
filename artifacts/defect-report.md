# Defect Report

## Pipeline result

The demo contains 10 test cases. Six passed and four failed. The failed cases below intentionally represent different production pipeline causes.

| Test case | Failure type | Current status |
| --- | --- | --- |
| TC05 | Synchronization Issue | Automation fix candidate |
| TC06 | Locator Change | Automation fix candidate |
| TC08 | Transient Infrastructure Failure | Controlled retry candidate |
| TC10 | Application Defect | Developer escalation required |

## Captured evidence

Each failed test has a dedicated screenshot under `screenshots/`: `TC05.png`, `TC06.png`, `TC08.png`, and `TC10.png`. Playwright also stores trace, video, and error-context artifacts under `test-results/`.

### TC05 - Synchronization Issue

**Observed error:** The Products dashboard was not visible within the short timing window.

**Root cause:** The demo delays the Products heading for 2.5 seconds, but the initial automation waits only 1.5 seconds.

**Exact issue location:** `src/pages/inventory.page.ts`, method `expectDashboardTooEarly()`.

```diff
- await expect(this.title).toBeVisible({ timeout: 1500 });
+ await expect(this.title).toBeVisible();
```

### TC06 - Locator Change

**Observed error:** `getByTestId('missing-username')` timed out because the locator does not exist in the current DOM.

**Exact issue location:** `src/pages/login.page.ts`, method `fillBrokenUsernameLocator()`.

```diff
- await this.page.getByTestId('missing-username').fill(username, { timeout: 1500 });
+ await this.usernameInput.fill(username);
```

### TC08 - Transient Infrastructure Failure

**Observed error:** Payment service returned HTTP 503 Service Unavailable.

### TC10 - Application Defect

**Observed error:** Expected coupon total was 80, but the application displayed 100.
