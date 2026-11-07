import childProcess from 'node:child_process';
import events from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const cli = url.fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const swiftPackage = url.fileURLToPath(new URL('../swift/SwiftLintChecks', import.meta.url));
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'kqc-cli-'));

afterAll(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

async function fakeSwift(source: string) {
  const directory = await fs.mkdtemp(path.join(workspace, 'bin-'));
  await fs.writeFile(path.join(directory, 'swift'), `#!${process.execPath}\n${source}\n`, { mode: 0o755 });

  return directory;
}

function run(args: readonly string[], executablePath = workspace) {
  return childProcess.spawnSync(process.execPath, [cli, ...args], {
    cwd: workspace,
    env: { ...process.env, PATH: executablePath },
    encoding: 'utf8',
    timeout: 10_000,
  });
}

test.each([
  { args: [] },
  { args: ['unknown'] },
  { args: ['--unknown'] },
  { args: ['swift-lint', '--help=false'] },
  { args: ['swift-lint', '--help', 'Sources'] },
  { args: ['swift-lint', '--fix'] },
  { args: ['swift-lint', 'Sources', '--unknown'] },
])('rejects invalid invocation $args without Swift', ({ args }) => {
  const result = run(args);
  expect(result.status).toBe(2);
  expect(result.stderr).toContain('Usage: kqc swift-lint [paths...]');
  expect(result.stdout).toBe('');
});

test.each([{ args: ['--help'] }, { args: ['swift-lint', '--help'] }])(
  'shows help for $args without Swift',
  ({ args }) => {
    const result = run(args);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: kqc swift-lint [paths...]');
    expect(result.stderr).toBe('');
  },
);

test('reports missing Swift', () => {
  const result = run(['swift-lint']);
  expect(result.status).toBe(127);
  expect(result.stderr).toBe('kqc: Swift 6.4 or newer is required; install it and ensure swift is on PATH.\n');
});

test.each([
  { args: [], targets: ['.'] },
  { args: ['Sources', 'Tests/Example Tests.swift'], targets: ['Sources', 'Tests/Example Tests.swift'] },
  { args: ['--', '-Example.swift'], targets: ['-Example.swift'] },
  { args: ['--', '--help', '--'], targets: ['--help', '--'] },
])('passes targets from $args as literal paths and preserves the caller directory', async ({ args, targets }) => {
  const bin = await fakeSwift('console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));');
  const result = run(['swift-lint', ...args], bin);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(JSON.parse(result.stdout)).toEqual({
    args: [
      'run',
      '--package-path',
      swiftPackage,
      'kqc-swift-lint',
      ...targets.map(target => path.resolve(workspace, target)),
    ],
    cwd: workspace,
  });
});

test('streams output and propagates Swift failure status', async () => {
  const bin = await fakeSwift(
    "console.log('source.swift:3:5: error: violation'); console.error('build failed'); process.exitCode = 23;",
  );

  const result = run(['swift-lint'], bin);
  expect(result.status).toBe(23);
  expect(result.stdout).toBe('source.swift:3:5: error: violation\n');
  expect(result.stderr).toBe('build failed\n');
});

test('reports other process launch failures', async () => {
  const bin = await fs.mkdtemp(path.join(workspace, 'denied-'));
  await fs.writeFile(path.join(bin, 'swift'), 'not executable', { mode: 0o644 });
  const result = run(['swift-lint'], bin);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('kqc: Cannot launch Swift:');
});

test('forwards SIGTERM and terminates with the child signal', async () => {
  const bin = await fakeSwift(
    "process.on('SIGTERM', () => { console.log('terminated'); process.kill(process.pid, 'SIGKILL'); }); console.log('ready'); setInterval(() => {}, 1000);",
  );

  const child = childProcess.spawn(process.execPath, [cli, 'swift-lint'], {
    cwd: workspace,
    env: { ...process.env, PATH: bin },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const output: string[] = [];
  child.stdout.on('data', data => output.push(String(data)));
  const closed = events.once(child, 'close');

  try {
    await events.once(child.stdout, 'data');
    child.kill('SIGTERM');
    const result = await closed;
    expect(result).toEqual([null, 'SIGKILL']);
    expect(output.join('')).toContain('terminated');
  } finally {
    child.kill('SIGKILL');
  }
}, 10_000);
