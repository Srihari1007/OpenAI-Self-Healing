import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const artifactsDirectory = resolve(projectRoot, 'artifacts');
const resolutionPath = resolve(artifactsDirectory, 'ai-resolution.md');
const summaryPath = resolve(artifactsDirectory, 'healing-summary.md');
const defectReportPath = resolve(artifactsDirectory, 'defect-report.md');
const playwrightCli = resolve(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');

type FailureId = 'TC05' | 'TC06' | 'TC08' | 'TC10';

interface Resolution {
  id: FailureId;
  title: string;
  body: string;
  guardrail: string;
  rerunApproved: boolean;
}

interface FileChange {
  id: FailureId;
  filePath: string;
  before: string;
  after: string;
  status: 'AUTO_HEALED' | 'ALREADY_HEALED' | 'TARGET_NOT_FOUND' | 'AMBIGUOUS_TARGET';
}

interface RerunResult {
  command: string;
  output: string;
  status: number;
}

const remediationRules: Record<FailureId, { guardrail: string; filePath?: string; before?: string; after?: string }> = {
  TC05: {
    guardrail: 'SAFE AUTOMATION FIX',
    filePath: 'src/pages/inventory.page.ts',
    before: `  async expectDashboardTooEarly(): Promise<void> {
    await expect(this.title).toBeVisible({ timeout: 1500 });
  }`,
    after: `  async expectDashboardTooEarly(): Promise<void> {
    await expect(this.title).toBeVisible();
  }`,
  },
  TC06: {
    guardrail: 'SAFE AUTOMATION FIX',
    filePath: 'src/pages/login.page.ts',
    before: `  async fillBrokenUsernameLocator(username: string): Promise<void> {
    await this.page.getByTestId('missing-username').fill(username, { timeout: 1500 });
  }`,
    after: `  async fillBrokenUsernameLocator(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }`,
  },
  TC08: {
    guardrail: 'SAFE AUTOMATION FIX',
    filePath: 'tests/pipeline-demo.spec.ts',
    before: `    const paymentControl = isHealingRun
      ? page.locator('[data-test="payment-service"]')
      : page.getByTestId('missing-payment-service');`,
    after: `    const paymentControl = isHealingRun
      ? page.locator('[data-test="payment-service"]')
      : page.locator('[data-test="payment-service"]');`,
  },
  TC10: { guardrail: 'APPLICATION FIX REQUIRED' },
};

function parseResolutions(markdown: string): Resolution[] {
  const sections = markdown.split(/^## /m).slice(1);
  const resolutions: Resolution[] = [];

  for (const section of sections) {
    const header = section.match(/^(TC\d+)\s*-\s*(.+)$/m);
    if (!header || !(header[1] in remediationRules)) continue;

    const id = header[1] as FailureId;
    const body = section.slice(header[0].length);
    const guardrail = body.match(/\*\*Recovery Guardrail:\*\*\s*(.+)/)?.[1]?.trim() ?? '';
    const rerunApproved = new RegExp(`\\b${id}\\b`, 'i').test(body.match(/\*\*Rerun:\*\*\s*(.+)/)?.[1] ?? '');
    resolutions.push({ id, title: header[2].trim(), body, guardrail, rerunApproved });
  }

  return [...new Map(resolutions.map((resolution) => [resolution.id, resolution])).values()];
}

async function applyApprovedFix(resolution: Resolution): Promise<FileChange | null> {
  const rule = remediationRules[resolution.id];
  if (!rule.filePath || !rule.before || !rule.after || resolution.guardrail !== rule.guardrail) return null;

  const filePath = resolve(projectRoot, rule.filePath);
  const source = await readFile(filePath, 'utf8');
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  const normalizedSource = source.replace(/\r\n/g, '\n');
  const occurrences = normalizedSource.split(rule.before).length - 1;

  if (occurrences === 0) {
    const healedOccurrences = normalizedSource.split(rule.after).length - 1;
    if (healedOccurrences === 1) {
      console.log(`[${resolution.id}] Approved remediation is already active: ${rule.filePath}`);
      return { id: resolution.id, filePath: rule.filePath, before: rule.before, after: rule.after, status: 'ALREADY_HEALED' };
    }
    console.warn(`[${resolution.id}] Replacement target not found: ${rule.filePath}`);
    return { id: resolution.id, filePath: rule.filePath, before: rule.before, after: rule.after, status: 'TARGET_NOT_FOUND' };
  }

  if (occurrences !== 1) {
    console.warn(`[${resolution.id}] Replacement target is ambiguous (${occurrences} matches): ${rule.filePath}`);
    return { id: resolution.id, filePath: rule.filePath, before: rule.before, after: rule.after, status: 'AMBIGUOUS_TARGET' };
  }

  const updatedSource = normalizedSource.replace(rule.before, rule.after).replace(/\n/g, lineEnding);
  await writeFile(filePath, updatedSource, 'utf8');
  console.log(`[${resolution.id}] Modified ${rule.filePath}`);
  return { id: resolution.id, filePath: rule.filePath, before: rule.before, after: rule.after, status: 'AUTO_HEALED' };
}

async function rerunTests(failureIds: FailureId[]): Promise<RerunResult> {
  const grep = failureIds.join('|');
  const args = ['test', 'tests/pipeline-demo.spec.ts', '--project=chromium', '--workers=1', '--grep', grep, '--reporter=list'];
  const command = `node ${playwrightCli} ${args.join(' ')}`;

  try {
    const result = await execFileAsync(process.execPath, [playwrightCli, ...args], {
      cwd: projectRoot,
      env: { ...process.env, DEMO_PHASE: 'healed' },
      maxBuffer: 20 * 1024 * 1024,
    });
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    process.stdout.write(output);
    return { command, output, status: 0 };
  } catch (error) {
    const processError = error as { stdout?: string; stderr?: string; code?: number };
    const output = [processError.stdout, processError.stderr].filter(Boolean).join('\n');
    process.stdout.write(output);
    return { command, output, status: typeof processError.code === 'number' ? processError.code : 1 };
  }
}

function formatChanges(changes: FileChange[]): string {
  if (changes.length === 0) return 'No source files were eligible for an approved automatic fix.';

  return changes.map((change) => {
    const detail = change.status === 'AUTO_HEALED'
      ? `\n\`\`\`diff\n- ${change.before}\n+ ${change.after}\n\`\`\``
      : change.status === 'ALREADY_HEALED'
        ? '\nThe approved remediation was already present; no additional source change was needed.'
      : `\nTarget status: ${change.status}. No source change was written.`;
    return `### ${change.id} - ${change.filePath}\n\nStatus: **${change.status}**${detail}`;
  }).join('\n\n');
}

function formatTestcaseDetails(changes: FileChange[]): string {
  const changeById = new Map(changes.map((change) => [change.id, change]));
  const details = [
    {
      id: 'TC05',
      status: changeById.get('TC05')?.status ?? 'NOT_APPLIED',
      file: 'src/pages/inventory.page.ts',
      locator: 'No locator change',
      action: 'Replaced the 1,500 ms visibility timeout with Playwright\'s default condition-based assertion timeout.',
    },
    {
      id: 'TC06',
      status: changeById.get('TC06')?.status ?? 'NOT_APPLIED',
      file: 'src/pages/login.page.ts',
      locator: 'Fixed locator: replaced missing-username test id with LoginPage.usernameInput',
      action: 'Replaced the obsolete missing test-id locator with the existing LoginPage usernameInput locator.',
    },
    {
      id: 'TC08',
      status: changeById.get('TC08')?.status ?? 'NOT_APPLIED',
      file: 'tests/pipeline-demo.spec.ts',
      locator: 'Fixed locator: replaced missing-payment-service test id with [data-test="payment-service"]',
      action: 'Replaced the obsolete payment locator with the stable payment-service data-test selector.',
    },
    {
      id: 'TC10',
      status: 'ESCALATED',
      file: 'No source file changed',
      locator: 'No locator change',
      action: 'Application server returned the incorrect checkout total of 100 instead of 80. Preserved the expected value and assertion; raise a developer bug for the application team to fix.',
    },
  ];

  return details.map((detail) => `### ${detail.id}\n\n- Status: **${detail.status}**\n- File changed: **${detail.file}**\n- Locator change: ${detail.locator}\n- Fix/action: ${detail.action}`).join('\n\n');
}

async function writeDefectReport(resolution: Resolution): Promise<void> {
  await writeFile(
    defectReportPath,
    `# Defect Report\n\n## ${resolution.id} - ${resolution.title}\n\n**Status:** ESCALATED\n\n**Failure type:** Application Server Error\n\n**Observed issue:** The application server returned checkout total **100** when the expected discounted total was **80**.\n\n**Automation action:** No source code, locator, or assertion was modified. The expected value remains 80.\n\n**Developer action required:** Raise a bug for the application team to investigate and correct the server-side coupon calculation. Do not weaken or change the test assertion.\n`,
    'utf8',
  );
  console.log(`[${resolution.id}] Generated artifacts/defect-report.md`);
}

function collectRerunOutcomes(output: string): { passed: FailureId[]; failed: FailureId[] } {
  const passed = new Set<FailureId>();
  const failed = new Set<FailureId>();
  const plainOutput = output.replace(/\u001b\[[0-9;]*m/g, '');

  for (const line of plainOutput.split(/\r?\n/)) {
    const result = line.match(/^\s*(ok|x|×)\s+\d+.*\b(TC(?:05|06|08|10))\b/);
    if (!result) continue;

    const id = result[2] as FailureId;
    if (result[1] === 'ok') passed.add(id);
    else failed.add(id);
  }

  return { passed: [...passed], failed: [...failed] };
}

async function writeSummary(
  resolutions: Resolution[],
  changes: FileChange[],
  rerun: RerunResult,
): Promise<void> {
  const rerunIds = resolutions.filter((resolution) => resolution.rerunApproved).map((resolution) => resolution.id);
  const outcomes = collectRerunOutcomes(rerun.output);
  const recoveryStatus = outcomes.failed.length === 0
    ? 'SUCCESS'
    : outcomes.passed.length > 0
      ? 'PARTIAL SUCCESS'
      : 'FAILED';
  const finalStatus = outcomes.failed.length === 1 && outcomes.failed[0] === 'TC10'
    ? `${outcomes.passed.length} recovered, 1 application defect remains open for developer fix`
    : `${outcomes.passed.length} recovered, ${outcomes.failed.length} still failing`;
  const reportOutput = rerun.output.trim().replace(/[ \t]+$/gm, '');
  const statuses = resolutions.map((resolution) => {
    if (resolution.id === 'TC05' || resolution.id === 'TC06' || resolution.id === 'TC08') {
      return `- ${resolution.id}: ${changes.find((change) => change.id === resolution.id)?.status ?? 'NOT_APPLIED'}`;
    }
    return `- ${resolution.id}: ESCALATED`;
  });

  await writeFile(
    summaryPath,
    `# Self-Healing Execution Summary\n\n- Initial failures: ${rerunIds.join(', ') || 'none'}\n- Recovery rerun: ${recoveryStatus}\n- Passed: ${outcomes.passed.join(', ') || 'none'}\n- Failed: ${outcomes.failed.join(', ') || 'none'}\n- Tests rerun: ${rerunIds.length}\n- Final status: ${finalStatus}\n\n## Testcase Changes and Actions\n\n${formatTestcaseDetails(changes)}\n\n## Status Overview\n\n${statuses.join('\n')}\n\n## Source Changes\n\n${formatChanges(changes)}\n\n## Rerun Details\n\nCommand: \`${rerun.command}\`\n\nProcess result: **${rerun.status === 0 ? 'PASSED' : 'FAILED'}**\n\n\`\`\`text\n${reportOutput}\n\`\`\`\n\nDeveloper action required: review modified files in VS Code before committing. This agent never commits, pushes, or creates pull requests.\n`,
    'utf8',
  );
}

export async function runSelfHealingAgent(): Promise<number> {
  await mkdir(artifactsDirectory, { recursive: true });
  const resolutionMarkdown = await readFile(resolutionPath, 'utf8');
  const resolutions = parseResolutions(resolutionMarkdown);
  const rerunResolutions = resolutions.filter((resolution) => resolution.rerunApproved);

  if (rerunResolutions.length === 0) {
    throw new Error(`No approved reruns were found in ${resolutionPath}.`);
  }

  const changes: FileChange[] = [];
  for (const resolution of resolutions) {
    const change = await applyApprovedFix(resolution);
    if (change) changes.push(change);
  }

  const defectResolution = resolutions.find((resolution) => resolution.id === 'TC10');
  if (defectResolution) await writeDefectReport(defectResolution);

  const rerun = await rerunTests(rerunResolutions.map((resolution) => resolution.id));
  await writeSummary(resolutions, changes, rerun);
  console.log(`Healing summary written to ${summaryPath}`);
  return rerun.status;
}

if (process.argv[1]?.endsWith('self-heal-agent.ts')) {
  runSelfHealingAgent()
    .then((status) => process.exitCode = status)
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
