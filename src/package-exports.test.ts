import fs from 'node:fs/promises';

import antiSlopPlugin from '@kamaal111/oxlint-plugin-anti-slop';

test('package exports stay in sync', async () => {
  const rootModule = await import('@kamaal111/kamaal-quality-config');
  const oxlintModule = await import('@kamaal111/kamaal-quality-config/oxlint');
  const oxfmtModule = await import('@kamaal111/kamaal-quality-config/oxfmt');

  expect(rootModule.default.oxlint).toBe(rootModule.oxlint);
  expect(rootModule.default.oxfmt).toBe(rootModule.oxfmt);
  expect(oxlintModule.default).toBe(rootModule.oxlint);
  expect(oxfmtModule.default).toBe(rootModule.oxfmt);

  const oxlintrc = JSON.parse(await fs.readFile('dist/oxlintrc.json', 'utf8'));

  const nullishPlugin = await import('@kamaal111/kamaal-quality-config/plugins/prefer-nullish');

  const loopsPlugin = await import('@kamaal111/kamaal-quality-config/plugins/prefer-while-true');

  expect(loopsPlugin.default.meta.name).toBe('kamaal-loops');
  expect(oxlintrc.rules['kamaal-loops/prefer-while-true']).toBe('error');
  expect(nullishPlugin.default.meta.name).toBe('kamaal-zod');
  expect(oxlintrc.rules['kamaal-zod/prefer-nullish']).toBe('error');
  expect(oxlintrc.rules['@stylistic/lines-between-class-members'][0]).toBe('error');
  expect(oxlintrc.rules['no-restricted-imports'][0]).toBe('error');
  expect(oxlintrc.rules['no-restricted-properties'][0]).toBe('error');
  const arrowsPlugin = await import('@kamaal111/kamaal-quality-config/plugins/require-multiline-arrow-braces');

  expect(arrowsPlugin.default.meta.name).toBe('kamaal-arrows');
  expect(oxlintrc.rules['kamaal-arrows/require-multiline-arrow-braces']).toBe('error');
  expect(oxlintrc).toHaveProperty('rules');
  expect(oxlintrc).not.toHaveProperty('oxfmt');
  expect(oxlintrc).toEqual(JSON.parse(JSON.stringify(rootModule.oxlint)));
  expect(Object.keys(antiSlopPlugin.rules).every(rule => Object.hasOwn(oxlintrc.rules, `anti-slop/${rule}`))).toBe(
    true,
  );
});

test('Swift format exports and generated JSON preserve the shared style', async () => {
  const rootModule = await import('@kamaal111/kamaal-quality-config');
  const swiftModule = await import('@kamaal111/kamaal-quality-config/swift-format');
  const jsonModule = await import('@kamaal111/kamaal-quality-config/swift-format.json', { with: { type: 'json' } });
  const generated = JSON.parse(await fs.readFile('swift-format.json', 'utf8'));

  expect(rootModule.default.swiftFormat).toBe(rootModule.swiftFormat);
  expect(swiftModule.default).toBe(rootModule.swiftFormat);
  expect(jsonModule.default).toEqual(rootModule.swiftFormat);
  expect(generated).toEqual(rootModule.swiftFormat);
  expect(generated.indentation).toEqual({ spaces: 4 });
  expect(generated.lineLength).toBe(120);
  expect(generated.rules.NeverForceUnwrap).toBe(true);
});
