import { lintWithRule } from './test-utils/lint-with-rule.ts';

const RULE_ID = 'kamaal-errors/no-nested-try';

test.each([
  'try { try { load(); } catch { recover(); } } catch { report(); }',
  'try { load(); } catch { try { recover(); } catch { report(); } }',
  'try { load(); } finally { try { cleanup(); } finally { finish(); } }',
  'try { try { load(); } finally { cleanup(); } } finally { finish(); }',
  'try { if (ready) { for (const item of items) { try { load(item); } catch { report(); } } } } catch { report(); }',
  'try { try { try { load(); } catch {} } catch {} } catch {}',
  'try { const work = () => { try { try { load(); } catch {} } catch {} }; } catch {}',
  'try { class Worker { static { try { try { load(); } catch {} } catch {} } } } catch {}',
])('rejects nested handlers without fixing: %s', async source => {
  const result = await lintWithRule({ plugin: 'no-nested-try.ts', ruleId: RULE_ID, source });

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(source);
});

test.each([
  ['fixture.js', 'try { try { load(); } catch {} } catch {}'],
  ['fixture.ts', 'try { const result: string = load(); try { save(result); } catch {} } catch {}'],
])('checks %s', async (filename, source) => {
  const result = await lintWithRule({ plugin: 'no-nested-try.ts', ruleId: RULE_ID, filename, source });

  expect(result.isReported).toBe(true);
  expect(result.fixedSource).toBe(source);
});

test.each([
  'try { load(); } catch { report(); }',
  'try { load(); } finally { cleanup(); }',
  'try { load(); } catch { report(); } try { save(); } catch { report(); }',
  'try { function save() { try { write(); } catch { report(); } } } catch { report(); }',
  'try { const save = function () { try { write(); } catch { report(); } }; } catch {}',
  'try { const save = () => { try { write(); } catch { report(); } }; } catch {}',
  'try { const worker = { save() { try { write(); } catch {} }, get value() { try { return read(); } catch { return 0; } } }; } catch {}',
  'try { class Worker { constructor() { try { load(); } catch {} } save() { try { write(); } catch {} } } } catch {}',
  'try { class Worker { value = (() => { try { load(); } catch {} })(); static { try { load(); } catch {} } } } catch {}',
  'try { const text = "try { try {} catch {} } catch {}"; /* try {} catch {} */ load(); } catch {}',
])('accepts independent handlers and scopes: %s', async source => {
  const result = await lintWithRule({ plugin: 'no-nested-try.ts', ruleId: RULE_ID, source });

  expect(result.isReported).toBe(false);
  expect(result.fixedSource).toBe(source);
});

test.each([
  ['try { try { try { load(); } catch {} } catch {} } catch {}', 2],
  ['try { try { load(); } catch {} try { save(); } catch {} } catch {}', 2],
  ['try { function save() { try { write(); } catch {} } try { load(); } catch {} } catch {}', 1],
  ['try { class Worker { save() { try { write(); } catch {} } } try { load(); } catch {} } catch {}', 1],
  ['try { const save = () => { try { try { write(); } catch {} } catch {} }; try { load(); } catch {} } catch {}', 2],
])('reports each nested handler once and restores surrounding depth: %s', async (source, count) => {
  const result = await lintWithRule({ plugin: 'no-nested-try.ts', ruleId: RULE_ID, source });

  expect(result.reportOutput.match(/kamaal-errors\(no-nested-try\)/gu)).toHaveLength(count);
  expect(result.fixedSource).toBe(source);
});

test('reports the inner handler location with Windows line endings', async () => {
  const result = await lintWithRule({
    plugin: 'no-nested-try.ts',
    ruleId: RULE_ID,
    source: 'try {\r\n    try { load(); } catch {}\r\n} catch {}',
  });

  expect(JSON.parse(result.reportOutput).diagnostics).toMatchObject([
    {
      code: 'kamaal-errors(no-nested-try)',
      message: 'Avoid nested try statements. Extract error handling into a helper or use sequential try blocks.',
      labels: [{ span: { line: 2, column: 5 } }],
    },
  ]);
});
