import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('package exports stay in sync', async () => {
  const rootModule = await import('@kamaal111/kamaal-quality-config');
  const oxlintModule = await import('@kamaal111/kamaal-quality-config/oxlint');
  const oxfmtModule = await import('@kamaal111/kamaal-quality-config/oxfmt');

  expect(rootModule.default.oxlint).toBe(rootModule.oxlint);
  expect(rootModule.default.oxfmt).toBe(rootModule.oxfmt);
  expect(oxlintModule.default).toBe(rootModule.oxlint);
  expect(oxfmtModule.default).toBe(rootModule.oxfmt);

  const oxlintrc = JSON.parse(await fs.readFile('dist/oxlintrc.json', 'utf8'));

  expect(oxlintrc).toHaveProperty('rules');
  expect(oxlintrc).not.toHaveProperty('oxfmt');
});

test('installed plugin exports load in Node without TypeScript stripping', async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-config-consumer-'));
  const packageDirectory = path.join(workspace, 'node_modules', '@kamaal111', 'kamaal-quality-config');

  try {
    await fs.mkdir(packageDirectory, { recursive: true });
    await fs.copyFile('package.json', path.join(packageDirectory, 'package.json'));
    await fs.cp('dist', path.join(packageDirectory, 'dist'), { recursive: true });
    await fs.cp('src/plugins', path.join(packageDirectory, 'src/plugins'), { recursive: true });

    const consumer = childProcess.spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `import imports from '@kamaal111/kamaal-quality-config/plugins/consistent-inline-type-imports';
         import ternary from '@kamaal111/kamaal-quality-config/plugins/no-nullish-check-first-ternary';
         console.log(JSON.stringify([imports.meta.name, ternary.meta.name]));`,
      ],
      { cwd: workspace, encoding: 'utf8' },
    );

    expect(consumer.stderr).toBe('');
    expect(consumer.status).toBe(0);
    expect(JSON.parse(consumer.stdout)).toEqual(['kamaal-imports', 'kamaal-ternary']);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});
