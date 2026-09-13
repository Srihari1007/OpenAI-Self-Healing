# AI Resolution Report

## Initial run

Detected 4 failures: TC05, TC06, TC08, TC10.

**Analysis source:** deterministic offline fallback (set OPENAI_API_KEY for live AI analysis)

## TC05 - synchronization: dashboard is ready before assertion

**Failure Type:** Synchronization Issue

**Root Cause:** The Products heading appears after the initial 1.5 second assertion window.

**Recommended Resolution:** Use Playwright's condition-based assertion with the configured timeout.

**Recovery Guardrail:** SAFE AUTOMATION FIX

**Rerun:** Only TC05 will be selected in the recovery phase.

## TC06 - locator drift: username control is discoverable

**Failure Type:** Locator Drift

**Root Cause:** The obsolete missing-username test id is not present in the DOM.

**Recommended Resolution:** Use the existing semantic Username placeholder locator owned by LoginPage.

**Recovery Guardrail:** SAFE AUTOMATION FIX

**Rerun:** Only TC06 will be selected in the recovery phase.

## TC08 - infrastructure: payment service is available

**Failure Type:** Transient Infrastructure Failure

**Root Cause:** The simulated payment dependency returned HTTP 503.

**Recommended Resolution:** Rerun after service recovery without changing the HTTP 200 assertion.

**Recovery Guardrail:** CONTROLLED RETRY

**Rerun:** Only TC08 will be selected in the recovery phase.

## TC10 - coupon discount is reflected in total

**Failure Type:** Application Defect

**Root Cause:** The simulated checkout response kept the total at 100 instead of applying SAVE20.

**Recommended Resolution:** Require the application total to return 80; never change the expected assertion to 100.

**Recovery Guardrail:** APPLICATION FIX REQUIRED

**Rerun:** Only TC10 will be selected in the recovery phase.

## Recovery decision

The runner activates only allow-listed demo remediations. Assertions remain unchanged. TC10 passes only after the simulated application response is corrected from 100 to 80.
