import { lintWithRule } from './test-utils/lint-with-rule.ts';

const RULE_ID = 'kamaal-zod/prefer-nonempty';

function lint(source: string) {
  return lintWithRule({ plugin: 'zod.ts', ruleId: RULE_ID, source });
}

test.each([
  ['z.string().min(1)', 'z.string().nonempty()'],
  ['z.coerce.string().min(1)', 'z.coerce.string().nonempty()'],
  ['z.string().trim().min(1, { error: "Required" })', 'z.string().trim().nonempty({ error: "Required" })'],
  ['z.array(z.string()).min(1)', 'z.array(z.string()).nonempty()'],
  ['z.set(z.number()).min(1, "Required")', 'z.set(z.number()).nonempty("Required")'],
  ['z.string().array().min(1)', 'z.string().array().nonempty()'],
  ['z.array(z.string()).max(5).min(1)', 'z.array(z.string()).max(5).nonempty()'],
  ['z.set(z.number()).size(5).min(1)', 'z.set(z.number()).size(5).nonempty()'],
  ['z.string().min(1).max(5)', 'z.string().nonempty().max(5)'],
  ['z.string()\n  .trim()\n  .min(1,)', 'z.string()\n  .trim()\n  .nonempty()'],
  [
    'z.string().min(/* bound */ 1, /* error */ "Required",)',
    'z.string().nonempty(/* bound */  /* error */ "Required",)',
  ],
  ['z.string().min(1 /* bound */)', 'z.string().nonempty( /* bound */)'],
  ['z.string().min(1, ("Required"))', 'z.string().nonempty(("Required"))'],
  ['z.string().min(1,)', 'z.string().nonempty()'],
  ['z.string().min((1))', 'z.string().nonempty()'],
])('rejects and fixes %s', async (expression, fixed) => {
  const prefix = 'import { z } from "zod";\nexport const schema = ';
  const result = await lint(prefix + expression + ';\n');

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(prefix + fixed + ';\n');
  expect((await lint(result.fixedSource)).isReported).toBe(false);
});

test.each([
  ['import { z as schema } from "zod";', 'schema.string()'],
  ['import * as schema from "zod/v4";', 'schema.array(schema.string())'],
  ['import schema from "zod";', 'schema.set(schema.number())'],
  ['import { string as text } from "zod/v4";', 'text()'],
  ['import { array, string } from "zod";', 'array(string())'],
  ['import { set, number } from "zod";', 'set(number())'],
])('resolves imports: %s', async (declaration, expression) => {
  const source = declaration + '\nexport const schema = ' + expression + '.min(1);\n';
  const result = await lint(source);

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(source.replace('.min(1)', '.nonempty()'));
});

test.each([
  'z.number().min(1)',
  'z.bigint().min(1n)',
  'z.string().min(2)',
  'z.string().min(limit)',
  'z.string().min(+1)',
  'z.string().min(...bounds)',
  'z.string().min(1, ...errors)',
  'z.string().min(1, "Required", extra)',
  'z.string().nonempty()',
  'schema.min(1)',
  'z.string().transform(convert).min(1)',
  'z.string().pipe(other).min(1)',
  'z.string().optional().min(1)',
  'z["string"]().min(1)',
  'z.string()["min"](1)',
  'z.string().min?.(1)',
  'z.string()?.min(1)',
  '"z.string().min(1)"',
])('accepts %s unchanged', async expression => {
  const source = 'import { z } from "zod";\nexport const schema = ' + expression + ';\n';
  const result = await lint(source);

  expect(result.isReported).toBe(false);
  expect(result.fixedSource).toBe(source);
});

test.each([
  'import { z } from "other"; export const schema = z.string().min(1);',
  'import { z } from "zod/v3"; export const schema = z.string().min(1);',
  'import { z } from "zod/mini"; export const schema = z.string().min(1);',
  'import { z } from "zod/v4/core"; export const schema = z.string().min(1);',
  'import { z } from "zod"; export function schema(z) { return z.string().min(1); }',
  'import { string } from "zod"; export function schema(string) { return string().min(1); }',
  'import { z } from "zod"; const text = z.string(); export const schema = text.min(1);',
  'import * as library from "zod"; export const schema = library.unrelated.string().min(1);',
  'export const schema = z.string().min(1);',
])('ignores unverified receivers: %s', async source => {
  const result = await lint(source);

  expect(result.isReported).toBe(false);
  expect(result.fixedSource).toBe(source);
});
