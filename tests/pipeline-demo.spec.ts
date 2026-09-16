import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { InventoryPage } from '../src/pages/inventory.page';
import { LoginPage } from '../src/pages/login.page';

const projectRoot = resolve(__dirname, '..');
const screenshotsDirectory = resolve(projectRoot, 'screenshots');
const artifactsDirectory = resolve(projectRoot, 'artifacts');
const isHealingRun = process.env.DEMO_PHASE === 'healed';

async function login(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login('standard_user', 'secret_sauce');
}

test.describe('Autonomous pipeline demo', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) {
      return;
    }

    const testCase = testInfo.title.match(/^TC\d+/)?.[0] ?? 'UNKNOWN';
    mkdirSync(screenshotsDirectory, { recursive: true });
    const prefix = isHealingRun ? 'recovery-' : '';
    await page.screenshot({ path: resolve(screenshotsDirectory, `${prefix}${testCase}.png`), fullPage: true });
  });

  test.afterAll(() => {
    if (isHealingRun) {
      return;
    }

    mkdirSync(artifactsDirectory, { recursive: true });
    writeFileSync(resolve(artifactsDirectory, 'defect-report.md'), `# Defect Report

## Pipeline result

The demo contains 10 test cases. Six passed and four failed. The failed cases below intentionally represent different production pipeline causes.

| Test case | Failure type | Current status |
| --- | --- | --- |
| TC05 | Synchronization Issue | Automation fix candidate |
| TC06 | Locator Change | Automation fix candidate |
| TC08 | Locator Drift | Automation fix candidate |
| TC10 | Application Server Error | Developer escalation required |

## Captured evidence

Each failed test has a dedicated screenshot under \`screenshots/\`: \`TC05.png\`, \`TC06.png\`, \`TC08.png\`, and \`TC10.png\`. Playwright also stores trace, video, and error-context artifacts under \`test-results/\`.

### TC05 - Synchronization Issue

**Observed error:** The Products dashboard was not visible within the short timing window.

**Root cause:** The demo delays the Products heading for 2.5 seconds, but the initial automation waits only 1.5 seconds.

**Exact issue location:** \`src/pages/inventory.page.ts\`, method \`expectDashboardTooEarly()\`.

\`\`\`diff
- await expect(this.title).toBeVisible({ timeout: 1500 });
+ await expect(this.title).toBeVisible();
\`\`\`

### TC06 - Locator Change

**Observed error:** \`getByTestId('missing-username')\` timed out because the locator does not exist in the current DOM.

**Exact issue location:** \`src/pages/login.page.ts\`, method \`fillBrokenUsernameLocator()\`.

\`\`\`diff
- await this.page.getByTestId('missing-username').fill(username, { timeout: 1500 });
+ await this.usernameInput.fill(username);
\`\`\`

### TC08 - Locator Drift

**Observed error:** The payment control was present, but the initial automation used the obsolete \`missing-payment-service\` test id.

**Exact issue location:** \`tests/pipeline-demo.spec.ts\`, TC08 payment control locator.

\`\`\`diff
- page.getByTestId('missing-payment-service')
+ page.locator('[data-test="payment-service"]')
\`\`\`

### TC10 - Application Server Error

**Observed error:** The application server returned checkout total 100 instead of the expected discounted total 80.

**Developer action:** Raise a bug for the application team to correct the server-side coupon calculation. Keep the expected assertion unchanged.
`);
    writeFileSync(resolve(artifactsDirectory, 'ai-resolution.md'), `# AI Resolution Report

## TC05 - Synchronization Issue

**Failure Type:** Synchronization Issue

**Root Cause:** The demo delays the Products heading for 2.5 seconds, but the initial automation waits only 1.5 seconds.

**Recommended Fix:** Use Playwright's normal condition-based web assertion timeout.

**Recovery Guardrail:** SAFE AUTOMATION FIX

**Exact file and method:** \`src/pages/inventory.page.ts\`, \`expectDashboardTooEarly()\`.

\`\`\`diff
- await expect(this.title).toBeVisible({ timeout: 1500 });
+ await expect(this.title).toBeVisible();
\`\`\`

**Action:** Activate the allow-listed synchronization remediation and rerun TC05.

**Rerun:** Only TC05 will be selected in the recovery phase.

## TC06 - Locator Change

**Failure Type:** Automation Framework Issue

**Root Cause:** The application locator changed and the old test id no longer exists.

**Recovery Guardrail:** SAFE AUTOMATION FIX

**Exact file and method:** \`src/pages/login.page.ts\`, \`fillBrokenUsernameLocator()\`.

\`\`\`diff
- await this.page.getByTestId('missing-username').fill(username, { timeout: 1500 });
+ await this.usernameInput.fill(username);
\`\`\`

**Action:** Activate the allow-listed stable locator and rerun TC06.

**Rerun:** Only TC06 will be selected in the recovery phase.

## TC08 - Locator Drift

**Failure Type:** Locator Drift

**Root Cause:** The payment control exists with test id \`payment-service\`, but the initial automation uses obsolete test id \`missing-payment-service\`.

**Exact file and line:** \`tests/pipeline-demo.spec.ts\`, TC08 payment control locator.

**Code change:** Replace \`page.getByTestId('missing-payment-service')\` with \`page.locator('[data-test="payment-service"]')\`.

**Recovery Guardrail:** SAFE AUTOMATION FIX

**Action:** Activate the allow-listed locator remediation and rerun TC08.

**Rerun:** Only TC08 will be selected in the recovery phase.

## TC10 - Genuine Application Defect

**Failure Type:** Application Server Error

**Root Cause:** The application server returned 100 instead of applying the SAVE20 discount and returning 80.

**Exact file and assertion:** \`tests/pipeline-demo.spec.ts\`, TC10 coupon total assertion.

**Code change:** No automation code change. Keep \`expectedTotal = 80\` and investigate the application pricing calculation that returned \`100\`.

**Recovery Guardrail:** APPLICATION FIX REQUIRED

**Action:** Raise a developer bug, require the application server fix, then rerun TC10 without weakening the expected value.

**Rerun:** Only TC10 will be selected in the recovery phase.

## Release decision

**INITIAL RUN FAILED:** Three failures have operational or automation recovery paths. TC10 requires an application fix before its rerun can pass.
`);
  });

  test('TC01 - valid user login passes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login('standard_user', 'secret_sauce');
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('TC02 - product list loads successfully', async ({ page }) => {
    await login(page);
    await new InventoryPage(page).expectLoaded();
  });

  test('TC03 - user can add a product', async ({ page }) => {
    await login(page);
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.addFirstProductToCart();
    await inventoryPage.expectCartItemCount(1);
  });

  test('TC04 - invalid user receives an error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login('invalid_user', 'invalid_password');
    await loginPage.expectLoginError('Username and password do not match');
  });

  test('TC05 - synchronization: dashboard is ready before assertion', async ({ page }) => {
    await login(page);
    await page.getByText('Products', { exact: true }).evaluate((title) => {
      title.style.visibility = 'hidden';
      window.setTimeout(() => {
        title.style.visibility = 'visible';
      }, 2500);
    });

    const inventoryPage = new InventoryPage(page);
    if (isHealingRun) {
      await inventoryPage.expectLoaded();
    } else {
      await inventoryPage.expectDashboardTooEarly();
    }
  });

  test('TC06 - locator drift: username control is discoverable', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    if (isHealingRun) {
      await loginPage.fillUsername('standard_user');
    } else {
      await loginPage.fillBrokenUsernameLocator('standard_user');
    }
  });

  test('TC07 - test data: required customer recovered', async ({ page }) => {
    await page.route('**/api/customers/12345', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ id: '12345', status: 'recreated' }) });
    });
    await page.goto('/');
    const responseStatus = await page.evaluate(async () => (await fetch('/api/customers/12345')).status);
    expect(responseStatus, 'Recovered test customer must exist before the workflow starts').toBe(200);
  });

  test('TC08 - locator drift: payment control is discoverable', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const paymentControl = document.createElement('button');
      paymentControl.dataset.test = 'payment-service';
      paymentControl.textContent = 'Payment service';
      document.body.append(paymentControl);
    });
    const paymentControl = isHealingRun
      ? page.locator('[data-test="payment-service"]')
      : page.getByTestId('missing-payment-service');
    await expect(paymentControl, 'Payment control should be discoverable').toBeVisible();
  });

  test('TC09 - checkout workflow reaches checkout page', async ({ page }) => {
    await login(page);
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.addFirstProductToCart();
    await inventoryPage.openCart();
    await inventoryPage.proceedToCheckout();
  });

  test('TC10 - coupon discount is reflected in total', async ({ page }) => {
    await page.route('**/api/checkout/total', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total: 100 }),
      });
    });
    await page.goto('/');
    const expectedTotal = 80;
    const displayedTotal = await page.evaluate(async () => {
      const response = await fetch('/api/checkout/total');
      const checkout = (await response.json()) as { total: number };
      return checkout.total;
    });
    expect(displayedTotal, 'Coupon SAVE20 should reduce the checkout total').toBe(expectedTotal);
  });
});
