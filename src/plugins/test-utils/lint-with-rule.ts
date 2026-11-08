import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

import type { OxlintConfig } from 'oxlint';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const PLUGINS_DIR = path.resolve(HERE, '..');

const REPO_ROOT = path.resolve(PLUGINS_DIR, '..', '..');

const OXLINT_BIN = path.join(REPO_ROOT, 'node_modules', '.bin', 'oxlint');

interface LintWithRuleInput {
  filename?: string;
  plugin: string;
  ruleId: string;
  source: string;
}

interface LintWithConfigInput {
  filename?: string;
  config: OxlintConfig;
  ruleId: string;
  source: string;
}

interface LintWithRuleResult {
  isReported: boolean;
  reportOutput: string;
  fixedSource: string;
}

function ruleDiagnosticCode(ruleId: string): string {
  const [namespace, ruleName] = ruleId.includes('/') ? ruleId.split('/') : ['eslint', ruleId];

  return `${namespace}(${ruleName})`;
}

export async function lintWithRule({
  plugin,
  ruleId,
  source,
  filename,
}: LintWithRuleInput): Promise<LintWithRuleResult> {
  const pluginPath = path.join(PLUGINS_DIR, plugin);

  return lintWithConfig({
    config: { jsPlugins: [pluginPath], rules: { [ruleId]: 'error' } },
    ruleId,
    source,
    filename,
  });
}

export async function lintWithConfig({
  config,
  ruleId,
  source,
  filename = 'fixture.ts',
}: LintWithConfigInput): Promise<LintWithRuleResult> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'oxlint-rule-test-'));

  try {
    const configPath = path.join(workspace, '.oxlintrc.json');
    const fixturePath = path.join(workspace, filename);

    await fs.writeFile(configPath, JSON.stringify(config));
    await fs.writeFile(fixturePath, source);

    const reportRun = childProcess.spawnSync(OXLINT_BIN, ['-c', configPath, '--format', 'json', fixturePath], {
      encoding: 'utf8',
    });

    if (reportRun.error || reportRun.stderr || (reportRun.status !== 0 && reportRun.status !== 1)) {
      throw new Error(`Oxlint failed: ${reportRun.error ?? reportRun.stderr ?? reportRun.stdout}`);
    }

    const diagnosticCode = ruleDiagnosticCode(ruleId);
    const isReported = reportRun.stdout.includes(diagnosticCode);

    childProcess.spawnSync(OXLINT_BIN, ['-c', configPath, '--fix', fixturePath], { encoding: 'utf8' });
    const fixedSource = await fs.readFile(fixturePath, 'utf8');

    return { isReported, reportOutput: reportRun.stdout, fixedSource };
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
