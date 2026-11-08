import { lintWithRule } from './test-utils/lint-with-rule.ts';

const RULE_ID = 'kamaal-arrows/require-multiline-arrow-braces';

function lint(source: string, filename = 'fixture.ts') {
  return lintWithRule({ plugin: 'require-multiline-arrow-braces.ts', ruleId: RULE_ID, source, filename });
}

test.each([
  ['const double = x =>\n  x * 2;', 'const double = x => { return (\n  x * 2\n); };'],
  ['const read = () => fetch(\n  "/users"\n);', 'const read = () => { return ( fetch(\n  "/users"\n)\n); };'],
  ['const read = () => (\n  42\n);', 'const read = () => { return ( (\n  42\n)\n); };'],
  [
    'const read = async () =>\n  await Promise.resolve(42);',
    'const read = async () => { return (\n  await Promise.resolve(42)\n); };',
  ],
  ['const read = () => (\n  work(), 42\n);', 'const read = () => { return ( (\n  work(), 42\n)\n); };'],
  ['const read = () => // answer\n  42;', 'const read = () => { return ( // answer\n  42\n); };'],
  ['const read = () => (42 // answer\n);', 'const read = () => { return ( (42 // answer\n)\n); };'],
  ['const read = () => /* answer\n */ 42;', 'const read = () => { return ( /* answer\n */ 42\n); };'],
  [
    'const read = (fallback = () => 1) =>\n  fallback();',
    'const read = (fallback = () => 1) => { return (\n  fallback()\n); };',
  ],
  ['const read = () =>\n  () =>\n    42;', 'const read = () => { return (\n  () => { return (\n    42\n); }\n); };'],
  [
    'const read = () =>\n  ready ? { name: "Kamaal" } : {};',
    'const read = () => { return (\n  ready ? { name: "Kamaal" } : {}\n); };',
  ],
  [
    'const label = "🐢"; const read = () =>\n  label;',
    'const label = "🐢"; const read = () => { return (\n  label\n); };',
  ],
  ['const read = () =>\r\n  42;', 'const read = () => { return (\r\n  42\n); };'],
])('reports and safely fixes %s', async (source, expected) => {
  const result = await lint(source);

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(expected);

  const fixed = await lint(result.fixedSource);

  expect(fixed.isReported).toBe(false);
  expect(fixed.fixedSource).toBe(expected);
});

test.each([
  'const double = x => x * 2;',
  'const double = (\n  x: number,\n) => x * 2;',
  'const read = () => {\n  return 42;\n};',
  'const read = () => ({ name: "Kamaal" });',
  'const read = () => ({\n  name: "Kamaal",\n});',
  'const read = () =>\n  ({\n    ...user,\n    name: "Kamaal",\n  });',
  'const read = async () => ({\n  name: "Kamaal",\n});',
  'const read = () => ((({\n  name: "Kamaal",\n})));',
  'const read = () => (42);',
  'const read = () => () => 42;',
])('accepts %s unchanged', async source => {
  const result = await lint(source);

  expect(result.isReported).toBe(false);
  expect(result.fixedSource).toBe(source);
});

test('fixes multiline JSX without changing its expression', async () => {
  const source = 'const View = () => (\n  <div>\n    Hello\n  </div>\n);';
  const result = await lint(source, 'fixture.tsx');

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe('const View = () => { return ( (\n  <div>\n    Hello\n  </div>\n)\n); };');

  const fixed = await lint(result.fixedSource, 'fixture.tsx');

  expect(fixed.isReported).toBe(false);
  expect(fixed.fixedSource).toBe(result.fixedSource);
});

test('autofix preserves sync, async, sequence, and nested return values', async () => {
  const source = `export const double = x =>
  x * 2;
export const asyncAnswer = async () =>
  await Promise.resolve(42);
export const sequence = () => (
  double(2), 42
);
export const mapped = () => [1, 2].map(n =>
  n * 2
);
export const nested = () =>
  () =>
    42;
`;

  const result = await lint(source);

  const module = await import(`data:text/javascript;base64,${Buffer.from(result.fixedSource).toString('base64')}`);

  expect(result.isReported).toBe(true);
  expect(module.double(3)).toBe(6);
  expect(await module.asyncAnswer()).toBe(42);
  expect(module.sequence()).toBe(42);
  expect(module.nested()()).toBe(42);
  expect(module.mapped()).toEqual([2, 4]);
});
