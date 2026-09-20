import fs from 'node:fs/promises';

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
