# Self-Healing Execution Summary

- Initial failures: TC05, TC06, TC08, TC10
- Recovery rerun: PARTIAL SUCCESS
- Passed: TC05, TC06, TC08
- Failed: TC10
- Tests rerun: 4
- Final status: 3 recovered, 1 application defect remains open for developer fix

## Testcase Changes and Actions

### TC05

- Status: **ALREADY_HEALED**
- File changed: **src/pages/inventory.page.ts**
- Locator change: No locator change
- Fix/action: Replaced the 1,500 ms visibility timeout with Playwright's default condition-based assertion timeout.

### TC06

- Status: **ALREADY_HEALED**
- File changed: **src/pages/login.page.ts**
- Locator change: Fixed locator: replaced missing-username test id with LoginPage.usernameInput
- Fix/action: Replaced the obsolete missing test-id locator with the existing LoginPage usernameInput locator.

### TC08

- Status: **ALREADY_HEALED**
- File changed: **tests/pipeline-demo.spec.ts**
- Locator change: Fixed locator: replaced missing-payment-service test id with [data-test="payment-service"]
- Fix/action: Replaced the obsolete payment locator with the stable payment-service data-test selector.

### TC10

- Status: **ESCALATED**
- File changed: **No source file changed**
- Locator change: No locator change
- Fix/action: Application server returned the incorrect checkout total of 100 instead of 80. Preserved the expected value and assertion; raise a developer bug for the application team to fix.

## Status Overview

- TC05: ALREADY_HEALED
- TC06: ALREADY_HEALED
- TC08: ALREADY_HEALED
- TC10: ESCALATED

## Source Changes

### TC05 - src/pages/inventory.page.ts

Status: **ALREADY_HEALED**
The approved remediation was already present; no additional source change was needed.

### TC06 - src/pages/login.page.ts

Status: **ALREADY_HEALED**
The approved remediation was already present; no additional source change was needed.

### TC08 - tests/pipeline-demo.spec.ts

Status: **ALREADY_HEALED**
The approved remediation was already present; no additional source change was needed.

## Rerun Details

Command: `node C:\Users\195980\OneDrive - Cognizant\Documents\Copilot\OpenAI - Self Healing\node_modules\@playwright\test\cli.js test tests/pipeline-demo.spec.ts --project=chromium --workers=1 --grep TC05|TC06|TC08|TC10 --reporter=list`

Process result: **FAILED**

```text
Running 4 tests using 1 worker

  ok 1 [chromium] › tests\pipeline-demo.spec.ts:200:7 › Autonomous pipeline demo › TC05 - synchronization: dashboard is ready before assertion (7.0s)
  ok 2 [chromium] › tests\pipeline-demo.spec.ts:217:7 › Autonomous pipeline demo › TC06 - locator drift: username control is discoverable (4.6s)
  ok 3 [chromium] › tests\pipeline-demo.spec.ts:236:7 › Autonomous pipeline demo › TC08 - locator drift: payment control is discoverable (2.4s)
  x  4 [chromium] › tests\pipeline-demo.spec.ts:258:7 › Autonomous pipeline demo › TC10 - coupon discount is reflected in total (2.3s)


  1) [chromium] › tests\pipeline-demo.spec.ts:258:7 › Autonomous pipeline demo › TC10 - coupon discount is reflected in total

    Error: Coupon SAVE20 should reduce the checkout total

    expect(received).toBe(expected) // Object.is equality

    Expected: 80
    Received: 100

      271 |       return checkout.total;
      272 |     });
    > 273 |     expect(displayedTotal, 'Coupon SAVE20 should reduce the checkout total').toBe(expectedTotal);
          |                                                                              ^
      274 |   });
      275 | });
      276 |
        at C:\Users\195980\OneDrive - Cognizant\Documents\Copilot\OpenAI - Self Healing\tests\pipeline-demo.spec.ts:273:78

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\pipeline-demo-Autonomous-p-f9994-count-is-reflected-in-total-chromium\test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results\pipeline-demo-Autonomous-p-f9994-count-is-reflected-in-total-chromium\video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results\pipeline-demo-Autonomous-p-f9994-count-is-reflected-in-total-chromium\error-context.md

    Error Context: test-results\pipeline-demo-Autonomous-p-f9994-count-is-reflected-in-total-chromium\error-context.md

  1 failed
    [chromium] › tests\pipeline-demo.spec.ts:258:7 › Autonomous pipeline demo › TC10 - coupon discount is reflected in total
  3 passed (20.5s)

(node:5960) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
```

Developer action required: review modified files in VS Code before committing. This agent never commits, pushes, or creates pull requests.
