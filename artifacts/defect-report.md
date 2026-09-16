# Defect Report

## TC10 - Genuine Application Defect

**Status:** ESCALATED

**Failure type:** Application Server Error

**Observed issue:** The application server returned checkout total **100** when the expected discounted total was **80**.

**Automation action:** No source code, locator, or assertion was modified. The expected value remains 80.

**Developer action required:** Raise a bug for the application team to investigate and correct the server-side coupon calculation. Do not weaken or change the test assertion.
