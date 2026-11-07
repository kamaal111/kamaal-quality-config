import { lintWithRule } from './test-utils/lint-with-rule.ts';

const RULE_ID = 'kamaal-zod/prefer-nullish';

test.each([
  'z.string().nullable().optional()',
  'z.string().optional().nullable()',
  'schema\n  .nullable()\n  .optional()',
  'schema.nullable({ error: "Invalid value" }).optional()',
  'builder.nullable().optional()',
])('rejects %s without an automatic fix', async expression => {
  const source = `export const schema = ${expression};\n`;
  const result = await lintWithRule({ plugin: 'prefer-nullish.ts', ruleId: RULE_ID, source });

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(source);
});

test.each([
  'z.string().nullish()',
  'z.string().nullable()',
  'z.string().optional()',
  'z.object({ first: z.string().nullable(), second: z.string().optional() })',
  '"schema.nullable().optional()"',
  'schema["nullable"]().optional()',
  'schema.nullable()["optional"]()',
])('accepts %s', async expression => {
  const result = await lintWithRule({
    plugin: 'prefer-nullish.ts',
    ruleId: RULE_ID,
    source: `export const schema = ${expression};\n`,
  });

  expect(result.isReported).toBe(false);
});
