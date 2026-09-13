import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  loadEnvFile(resolve(projectRoot, '.env'));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const playwrightCli = resolve(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const artifactsDirectory = resolve(projectRoot, 'artifacts');
const aiResolutionPath = resolve(artifactsDirectory, 'ai-resolution.md');
const recoverySummaryPath = resolve(artifactsDirectory, 'healing-summary.md');
const expectedDemoFailures = ['TC05', 'TC06', 'TC08', 'TC10'];

const remediationCatalog = {
  TC05: {
    type: 'Synchronization Issue',
    rootCause: 'The Products heading appears after the initial 1.5 second assertion window.',
    fix: "Use Playwright's condition-based assertion with the configured timeout.",
    safety: 'SAFE AUTOMATION FIX',
  },
  TC06: {
    type: 'Locator Drift',
    rootCause: 'The obsolete missing-username test id is not present in the DOM.',
    fix: 'Use the existing semantic Username placeholder locator owned by LoginPage.',
    safety: 'SAFE AUTOMATION FIX',
  },
  TC08: {
    type: 'Transient Infrastructure Failure',
    rootCause: 'The simulated payment dependency returned HTTP 503.',
    fix: 'Rerun after service recovery without changing the HTTP 200 assertion.',
    safety: 'CONTROLLED RETRY',
  },
  TC10: {
    type: 'Application Defect',
    rootCause: 'The simulated checkout response kept the total at 100 instead of applying SAVE20.',
    fix: 'Require the application total to return 80; never change the expected assertion to 100.',
    safety: 'APPLICATION FIX REQUIRED',
  },
};

function runPlaywright(args, environment = {}, capture = false) {
  return spawnSync(process.execPath, [playwrightCli, ...args], {
    cwd: projectRoot,
    env: { ...process.env, ...environment },
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    maxBuffer: 20 * 1024 * 1024,
  });
}

function collectFailedTests(report) {
  const failed = [];
  const visitSuite = (suite) => {
    for (const spec of suite.specs ?? []) {
      const failedTest = (spec.tests ?? []).some((test) =>
        (test.results ?? []).some((result) => ['failed', 'timedOut'].includes(result.status)),
      );
      if (failedTest) {
        const id = spec.title.match(/^TC\d+/)?.[0];
        if (id) failed.push({ id, title: spec.title });
      }
    }
    for (const child of suite.suites ?? []) visitSuite(child);
  };
  for (const suite of report.suites ?? []) visitSuite(suite);
  return [...new Map(failed.map((failure) => [failure.id, failure])).values()];
}

function extractOutputText(response) {
  for (const output of response.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  throw new Error('The OpenAI response did not contain output text.');
}

async function analyzeWithOpenAI(failures) {
  if (!process.env.OPENAI_API_KEY) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: 'Classify Playwright demo failures. Preserve assertions. Never recommend weakening expected business values. Return one analysis per supplied test ID.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            failures.map(({ id, title }) => ({ id, title, evidence: remediationCatalog[id] })),
          ),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'playwright_failure_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              analyses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string' },
                    rootCause: { type: 'string' },
                    fix: { type: 'string' },
                    safety: { type: 'string' },
                  },
                  required: ['id', 'type', 'rootCause', 'fix', 'safety'],
                  additionalProperties: false,
                },
              },
            },
            required: ['analyses'],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Responses API returned ${response.status}: ${await response.text()}`);
  }

  return JSON.parse(extractOutputText(await response.json())).analyses;
}

function createResolutionMarkdown(failures, analyses, source) {
  const sections = failures.map(({ id, title }) => {
    const analysis = analyses.find((candidate) => candidate.id === id) ?? remediationCatalog[id];
    return `## ${id} - ${title.replace(/^TC\d+\s*-\s*/, '')}

**Failure Type:** ${analysis.type}

**Root Cause:** ${analysis.rootCause}

**Recommended Resolution:** ${analysis.fix}

**Recovery Guardrail:** ${analysis.safety}

**Rerun:** Only ${id} will be selected in the recovery phase.`;
  });

  return `# AI Resolution Report

## Initial run

Detected ${failures.length} failures: ${failures.map(({ id }) => id).join(', ')}.

**Analysis source:** ${source}

${sections.join('\n\n')}

## Recovery decision

The runner activates only allow-listed demo remediations. Assertions remain unchanged. TC10 passes only after the simulated application response is corrected from 100 to 80.
`;
}

function openResolutionReport() {
  if (process.env.DEMO_OPEN_REPORT === '0') return;

  let child;
  if (process.platform === 'win32') {
    child = spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Process', '-LiteralPath', aiResolutionPath], {
      detached: true,
      stdio: 'ignore',
    });
  } else if (process.platform === 'darwin') {
    child = spawn('open', [aiResolutionPath], { detached: true, stdio: 'ignore' });
  } else {
    child = spawn('xdg-open', [aiResolutionPath], { detached: true, stdio: 'ignore' });
  }
  child.unref();
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function main() {
  mkdirSync(artifactsDirectory, { recursive: true });
  console.log('\n[1/4] Running the initial Chromium demo...');
  const initial = runPlaywright(
    ['test', 'tests/pipeline-demo.spec.ts', '--project=chromium', '--workers=1', '--reporter=json'],
    { DEMO_PHASE: 'initial' },
    true,
  );

  if (!initial.stdout) {
    process.stderr.write(initial.stderr ?? 'Initial run produced no JSON report.\n');
    process.exit(1);
  }

  let report;
  try {
    report = JSON.parse(initial.stdout);
  } catch {
    process.stderr.write(initial.stdout);
    process.stderr.write(initial.stderr ?? '');
    throw new Error('Could not parse the Playwright JSON report.');
  }

  const failures = collectFailedTests(report);
  const failureIds = failures.map(({ id }) => id);
  const unexpected = failureIds.filter((id) => !expectedDemoFailures.includes(id));
  const missing = expectedDemoFailures.filter((id) => !failureIds.includes(id));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(`Unexpected initial failure set: ${failureIds.join(', ') || 'none'}`);
  }
  console.log(`Detected failures: ${failureIds.join(', ')}`);

  console.log('\n[2/4] Generating artifacts/ai-resolution.md...');
  let analyses;
  let analysisSource = 'OpenAI Responses API';
  try {
    analyses = await analyzeWithOpenAI(failures);
  } catch (error) {
    console.warn(`OpenAI analysis was unavailable: ${error.message}`);
  }
  if (!analyses) {
    analysisSource = 'deterministic offline fallback (set OPENAI_API_KEY for live AI analysis)';
    analyses = failures.map(({ id }) => ({ id, ...remediationCatalog[id] }));
  }
  writeFileSync(aiResolutionPath, createResolutionMarkdown(failures, analyses, analysisSource));
  console.log(`Resolution ready: ${aiResolutionPath}`);

  console.log('\n[3/4] Opening the AI resolution for review...');
  openResolutionReport();
  const reviewSeconds = Number(process.env.DEMO_REVIEW_SECONDS ?? 8);
  if (reviewSeconds > 0) await wait(reviewSeconds * 1000);

  console.log('\n[4/4] Activating approved remediations and rerunning failed tests...');
  const recovery = runPlaywright(
    [
      'test',
      'tests/pipeline-demo.spec.ts',
      '--project=chromium',
      '--workers=1',
      '--grep',
      failureIds.join('|'),
      '--reporter=list',
    ],
    { DEMO_PHASE: 'healed' },
  );

  const passed = recovery.status === 0;
  writeFileSync(
    recoverySummaryPath,
    `# Self-Healing Execution Summary\n\n- Initial failures: ${failureIds.join(', ')}\n- Recovery rerun: ${passed ? 'PASSED' : 'FAILED'}\n- Tests rerun: ${failureIds.length}\n- Final status: ${passed ? `${failureIds.length}/${failureIds.length} recovered` : 'Review required'}\n`,
  );
  console.log(`\nRecovery summary: ${recoverySummaryPath}`);
  process.exit(recovery.status ?? 1);
}

await main();
