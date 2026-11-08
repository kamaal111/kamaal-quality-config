import { lintWithRule } from './test-utils/lint-with-rule.ts';

const RULE_ID = 'kamaal-loops/prefer-while-true';

test.each([
  ['for (;;) { work(); }', 'while (true) { work(); }'],
  ['const label = "retry 🐢"; for (;;) { work(label); }', 'const label = "retry 🐢"; while (true) { work(label); }'],
  ['for(;;) work();', 'while (true) work();'],
  ['for (\n  ;\n  ;\n) { work(); }', 'while (true) { work(); }'],
  [
    'retry: for (;;) { if (ready) { continue retry; } break; }',
    'retry: while (true) { if (ready) { continue retry; } break; }',
  ],
  [
    'for (;;) { /* keep body */ for (;;) { work(); break; } break; }',
    'while (true) { /* keep body */ while (true) { work(); break; } break; }',
  ],
  ['for (;;) /* keep after header */ { work(); }', 'while (true) /* keep after header */ { work(); }'],
])('reports and safely fixes %s', async (source, expected) => {
  const result = await lintWithRule({ plugin: 'prefer-while-true.ts', ruleId: RULE_ID, source });

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(expected);

  const fixed = await lintWithRule({
    plugin: 'prefer-while-true.ts',
    ruleId: RULE_ID,
    source: result.fixedSource,
  });

  expect(fixed.isReported).toBe(false);
  expect(fixed.fixedSource).toBe(expected);
});

test.each([
  'for ( /* retry */ ; ; ) { work(); }',
  'for /* retry */ (;;) { work(); }',
  'for (; // retry\n;) { work(); }',
  'for (;; /* retry */) { work(); }',
])('reports without changing header comments: %s', async source => {
  const result = await lintWithRule({ plugin: 'prefer-while-true.ts', ruleId: RULE_ID, source });

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(source);
});

test.each([
  'while (true) { work(); }',
  'for (; ready; ) { work(); }',
  'for (start(); ; ) { work(); }',
  'for (;; advance()) { work(); }',
  'for (let i = 0; ; i++) { work(i); }',
  'for (let i = 0; i < 3; i++) { work(i); }',
  'for (const item of items) { work(item); }',
  'for (const key in object) { work(key); }',
  'const example = "for (;;) {}";',
])('accepts %s', async source => {
  const result = await lintWithRule({ plugin: 'prefer-while-true.ts', ruleId: RULE_ID, source });

  expect(result.isReported).toBe(false);
  expect(result.fixedSource).toBe(source);
});
