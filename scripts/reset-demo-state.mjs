import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const baselineRestorations = [
  {
    id: 'TC05',
    filePath: 'src/pages/inventory.page.ts',
    healed: `  async expectDashboardTooEarly(): Promise<void> {
    await expect(this.title).toBeVisible();
  }`,
    baseline: `  async expectDashboardTooEarly(): Promise<void> {
    await expect(this.title).toBeVisible({ timeout: 1500 });
  }`,
  },
  {
    id: 'TC06',
    filePath: 'src/pages/login.page.ts',
    healed: `  async fillBrokenUsernameLocator(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }`,
    baseline: `  async fillBrokenUsernameLocator(username: string): Promise<void> {
    await this.page.getByTestId('missing-username').fill(username, { timeout: 1500 });
  }`,
  },
  {
    id: 'TC08',
    filePath: 'tests/pipeline-demo.spec.ts',
    healed: `    const paymentControl = isHealingRun
      ? page.locator('[data-test="payment-service"]')
      : page.locator('[data-test="payment-service"]');`,
    baseline: `    const paymentControl = isHealingRun
      ? page.locator('[data-test="payment-service"]')
      : page.getByTestId('missing-payment-service');`,
  },
];

for (const restoration of baselineRestorations) {
  const absolutePath = resolve(projectRoot, restoration.filePath);
  const source = await readFile(absolutePath, 'utf8');
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  const normalizedSource = source.replace(/\r\n/g, '\n');

  if (normalizedSource.includes(restoration.baseline)) {
    console.log(`[${restoration.id}] Baseline already active`);
    continue;
  }

  const healedOccurrences = normalizedSource.split(restoration.healed).length - 1;
  if (healedOccurrences !== 1) {
    throw new Error(
      `[${restoration.id}] Cannot restore demo baseline in ${restoration.filePath}: expected one healed block, found ${healedOccurrences}`,
    );
  }

  const restoredSource = normalizedSource.replace(restoration.healed, restoration.baseline).replace(/\n/g, lineEnding);
  await writeFile(absolutePath, restoredSource, 'utf8');
  console.log(`[${restoration.id}] Restored intentional failure baseline`);
}
