import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import packageJSON from '../package.json' with { type: 'json' };

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

const consumerNode = process.env.CONSUMER_NODE ?? process.execPath;

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-config-packed-consumer-'));

afterAll(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

beforeAll(async () => {
  const tarball = path.join(workspace, 'quality-config.tgz');

  childProcess.execFileSync('pnpm', ['pack', '--out', tarball], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 60_000,
  });

  await fs.writeFile(
    path.join(workspace, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        ...packageJSON.dependencies,
        [packageJSON.name]: `file:${tarball}`,
        oxlint: packageJSON.devDependencies.oxlint,
        'oxlint-tsgolint': packageJSON.devDependencies['oxlint-tsgolint'],
      },
    }),
  );

  childProcess.execFileSync('pnpm', ['install', '--ignore-scripts'], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 60_000,
  });

  await fs.writeFile(
    path.join(workspace, '.oxlintrc.json'),
    JSON.stringify({ extends: [`node_modules/${packageJSON.name}/dist/oxlintrc.json`] }),
  );

  await fs.writeFile(path.join(workspace, 'clean.js'), 'export const answer = 42;\n');
}, 120_000);

test('packed exports and generated configuration load in the consumer runtime', () => {
  const consumer = childProcess.spawnSync(
    consumerNode,
    [
      '--input-type=module',
      '--eval',
      `import fs from 'node:fs/promises';
       import quality, { oxfmt, oxlint } from '@kamaal111/kamaal-quality-config';
       import oxfmtConfig from '@kamaal111/kamaal-quality-config/oxfmt';
       import oxlintConfig from '@kamaal111/kamaal-quality-config/oxlint';
       import importsPlugin from '@kamaal111/kamaal-quality-config/plugins/consistent-inline-type-imports';
       import ternaryPlugin from '@kamaal111/kamaal-quality-config/plugins/no-nullish-check-first-ternary';

       const entrypoint = import.meta.resolve('@kamaal111/kamaal-quality-config');
       const generatedConfig = JSON.parse(await fs.readFile(new URL('./oxlintrc.json', entrypoint), 'utf8'));
       const metadata = JSON.parse(await fs.readFile(new URL('../package.json', entrypoint), 'utf8'));

       console.log(JSON.stringify({
         exportIdentities: [quality.oxlint === oxlint, quality.oxfmt === oxfmt, oxlintConfig === oxlint, oxfmtConfig === oxfmt],
         pluginNames: [importsPlugin.meta.name, ternaryPlugin.meta.name],
         style: oxfmt,
         generatedConfig,
         config: oxlint,
         engine: metadata.engines.node,
       }));`,
    ],
    { cwd: workspace, encoding: 'utf8', timeout: 30_000 },
  );

  expect(consumer.error).toBeUndefined();
  expect(consumer.stderr).toBe('');
  expect(consumer.status).toBe(0);

  const result = JSON.parse(consumer.stdout);

  expect(result.exportIdentities).toEqual([true, true, true, true]);
  expect(result.pluginNames).toEqual(['kamaal-imports', 'kamaal-ternary']);
  expect(result.style).toEqual({ printWidth: 120, arrowParens: 'avoid', singleQuote: true });
  expect(result.generatedConfig).toEqual(result.config);
  expect(result.engine).toBe('>=22.12.0');
});

test('packed JSON configuration loads its plugins in a consumer project', () => {
  const lint = childProcess.spawnSync(consumerNode, ['node_modules/oxlint/bin/oxlint', 'clean.js'], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 30_000,
  });

  expect(lint.error).toBeUndefined();
  expect(lint.stderr).toBe('');
  expect(lint.status).toBe(0);
  expect(lint.stdout).toContain('Found 0 warnings and 0 errors.');
});
