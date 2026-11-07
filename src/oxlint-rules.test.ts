import path from 'node:path';

import oxlintConfig from './oxlint.ts';
import { lintWithConfig } from './plugins/test-utils/lint-with-rule.ts';

function lint(ruleId: keyof typeof oxlintConfig.rules, source: string) {
  return lintWithConfig({
    config: {
      jsPlugins: [path.resolve('node_modules/@stylistic/eslint-plugin/dist/index.js')],
      rules: { [ruleId]: oxlintConfig.rules[ruleId] },
    },
    ruleId,
    source,
  });
}

test.each(["import { readFile } from 'node:fs/promises';", "import * as fs from 'node:fs';"])(
  'rejects non-default Node imports: %s',
  async source => {
    expect((await lint('no-restricted-imports', source)).isReported).toBe(true);
  },
);

test('accepts default Node imports', async () => {
  expect((await lint('no-restricted-imports', "import fs from 'node:fs/promises';")).isReported).toBe(false);
});

test('rejects Object.assign without fixing it', async () => {
  const source = 'export const result = Object.assign(target, source);';
  const result = await lint('no-restricted-properties', source);

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(source);
});

test('accepts object spread', async () => {
  expect((await lint('no-restricted-properties', 'export const result = { ...target, ...source };')).isReported).toBe(
    false,
  );
});

const COMPACT_CLASS = `export class Example {
  private readonly value: string;
  readonly label = 'example';
  constructor(value: string) {
    this.value = value;
  }
  read(): string {
    return this.value;
  }
}
`;

const SPACED_CLASS = `export class Example {
  private readonly value: string;
  readonly label = 'example';

  constructor(value: string) {
    this.value = value;
  }

  read(): string {
    return this.value;
  }
}
`;

test('requires and fixes blank lines around constructors and methods', async () => {
  const result = await lint('@stylistic/lines-between-class-members', COMPACT_CLASS);

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(SPACED_CLASS);
});

test('accepts spaced methods and grouped fields', async () => {
  const result = await lint('@stylistic/lines-between-class-members', SPACED_CLASS);

  expect(result.isReported).toBe(false);
  expect(result.fixedSource).toBe(SPACED_CLASS);
});
