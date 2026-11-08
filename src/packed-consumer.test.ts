import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

import packageJSON from '../package.json' with { type: 'json' };

const repositoryRoot = url.fileURLToPath(new URL('../', import.meta.url));

const consumerNode = process.env.CONSUMER_NODE ?? process.execPath;

const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-config-packed-consumer-'));

afterAll(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

beforeAll(async () => {
  const tarball = path.join(workspace, 'quality-config.tgz');

  childProcess.execFileSync('pnpm', ['pack', '--out', tarball], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 60_000,
  });

  await fs.writeFile(
    path.join(workspace, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        [packageJSON.name]: `file:${tarball}`,
        oxlint: packageJSON.devDependencies.oxlint,
        'oxlint-tsgolint': packageJSON.devDependencies['oxlint-tsgolint'],
      },
    }),
  );

  childProcess.execFileSync('pnpm', ['install', '--ignore-scripts'], {
    cwd: workspace,
    encoding: 'utf8',
    timeout: 60_000,
  });

  await fs.writeFile(
    path.join(workspace, '.oxlintrc.json'),
    JSON.stringify({ extends: [`node_modules/${packageJSON.name}/dist/oxlintrc.json`] }),
  );

  await fs.writeFile(
    path.join(workspace, 'oxlint.config.ts'),
    "import config from '@kamaal111/kamaal-quality-config/oxlint';\nexport default config;\n",
  );

  await fs.writeFile(path.join(workspace, 'clean.js'), 'export const answer = 42;\n');
}, 120_000);

test('packed exports and generated configuration load in the consumer runtime', () => {
  const consumer = childProcess.spawnSync(
    consumerNode,
    [
      '--input-type=module',
      '--eval',
      `import fs from 'node:fs/promises';
       import quality, { oxfmt, oxlint, swiftFormat } from '@kamaal111/kamaal-quality-config';
       import oxfmtConfig from '@kamaal111/kamaal-quality-config/oxfmt';
       import oxlintConfig from '@kamaal111/kamaal-quality-config/oxlint';
       import swiftConfig from '@kamaal111/kamaal-quality-config/swift-format';
       import swiftJSON from '@kamaal111/kamaal-quality-config/swift-format.json' with { type: 'json' };
       import importsPlugin from '@kamaal111/kamaal-quality-config/plugins/consistent-inline-type-imports';
       import ternaryPlugin from '@kamaal111/kamaal-quality-config/plugins/no-nullish-check-first-ternary';

       const { default: loopsPlugin } = await import('@kamaal111/kamaal-quality-config/plugins/prefer-while-true');

       const { default: nullishPlugin } = await import('@kamaal111/kamaal-quality-config/plugins/prefer-nullish');

       const entrypoint = import.meta.resolve('@kamaal111/kamaal-quality-config');
       const generatedConfig = JSON.parse(await fs.readFile(new URL('./oxlintrc.json', entrypoint), 'utf8'));
       const installedSwiftConfig = JSON.parse(await fs.readFile('node_modules/@kamaal111/kamaal-quality-config/swift-format.json', 'utf8'));
       const metadata = JSON.parse(await fs.readFile(new URL('../package.json', entrypoint), 'utf8'));

       console.log(JSON.stringify({
         exportIdentities: [quality.oxlint === oxlint, quality.oxfmt === oxfmt, oxlintConfig === oxlint, oxfmtConfig === oxfmt],
         swiftExportIdentities: [quality.swiftFormat === swiftFormat, swiftConfig === swiftFormat],
         swiftConfig: swiftFormat,
         swiftJSON,
         installedSwiftConfig,
         pluginNames: [importsPlugin.meta.name, ternaryPlugin.meta.name, nullishPlugin.meta.name, loopsPlugin.meta.name],
         style: oxfmt,
         generatedConfig,
         config: oxlint,
         engine: metadata.engines.node,
       }));`,
    ],
    { cwd: workspace, encoding: 'utf8', timeout: 30_000 },
  );

  expect(consumer.error).toBeUndefined();
  expect(consumer.stderr).toBe('');
  expect(consumer.status).toBe(0);

  const result = JSON.parse(consumer.stdout);

  expect(result.exportIdentities).toEqual([true, true, true, true]);
  expect(result.pluginNames).toEqual(['kamaal-imports', 'kamaal-ternary', 'kamaal-zod', 'kamaal-loops']);
  expect(result.style).toEqual({ printWidth: 120, arrowParens: 'avoid', singleQuote: true });
  expect(result.generatedConfig).toEqual(result.config);
  expect(result.swiftExportIdentities).toEqual([true, true]);
  expect(result.swiftJSON).toEqual(result.swiftConfig);
  expect(result.installedSwiftConfig).toEqual(result.swiftConfig);
  expect(result.swiftConfig.indentation).toEqual({ spaces: 4 });
  expect(result.engine).toBe('>=22.12.0');
});

describe.each(['.oxlintrc.json', 'oxlint.config.ts'])('packed %s configuration', configuration => {
  test('loads plugins without direct consumer plugin dependencies', () => {
    const lint = childProcess.spawnSync(
      consumerNode,
      ['node_modules/oxlint/bin/oxlint', '-c', configuration, 'clean.js'],
      { cwd: workspace, encoding: 'utf8', timeout: 30_000 },
    );

    expect(lint.error).toBeUndefined();
    expect(lint.stderr).toBe('');
    expect(lint.status).toBe(0);
    expect(lint.stdout).toContain('Found 0 warnings and 0 errors.');
  });

  test.each([
    ['nullish.js', 'export const schema = z.string().nullable().optional();', 'kamaal-zod(prefer-nullish)'],
    [
      'spacing.js',
      'export class Example { value = 1; read() { return this.value; } }',
      '@stylistic(lines-between-class-members)',
    ],
    [
      'imports.js',
      "import { readFile } from 'node:fs/promises';\nexport { readFile };",
      'eslint(no-restricted-imports)',
    ],
    ['loop.js', 'export function work() { for (;;) { break; } }', 'kamaal-loops(prefer-while-true)'],
    ['assign.js', 'export const result = Object.assign({}, { value: 1 });', 'eslint(no-restricted-properties)'],
  ])('rejects %s', async (filename, source, diagnostic) => {
    await fs.writeFile(path.join(workspace, filename), source);

    const lint = childProcess.spawnSync(
      consumerNode,
      ['node_modules/oxlint/bin/oxlint', '-c', configuration, '--format', 'json', filename],
      { cwd: workspace, encoding: 'utf8', timeout: 30_000 },
    );

    expect(lint.error).toBeUndefined();
    expect(lint.stderr).toBe('');
    expect(lint.status).toBe(1);
    expect(lint.stdout).toContain(diagnostic);
  });

  test('fixes infinite for loops and accepts the resulting while loop', async () => {
    const filename = 'fixed-loop.js';
    await fs.writeFile(path.join(workspace, filename), 'export function work() { for (;;) { break; } }\n');

    const fix = childProcess.spawnSync(
      consumerNode,
      ['node_modules/oxlint/bin/oxlint', '-c', configuration, '--fix', filename],
      {
        cwd: workspace,
        encoding: 'utf8',
        timeout: 30_000,
      },
    );

    expect(fix.error).toBeUndefined();
    expect(fix.stderr).toBe('');
    expect(fix.status).toBe(0);
    expect(await fs.readFile(path.join(workspace, filename), 'utf8')).toBe(
      'export function work() { while (true) { break; } }\n',
    );

    const lint = childProcess.spawnSync(
      consumerNode,
      ['node_modules/oxlint/bin/oxlint', '-c', configuration, '--format', 'json', filename],
      {
        cwd: workspace,
        encoding: 'utf8',
        timeout: 30_000,
      },
    );

    expect(lint.error).toBeUndefined();
    expect(lint.stderr).toBe('');
    expect(lint.status).toBe(0);
    expect(JSON.parse(lint.stdout).diagnostics).toEqual([]);
  });
});

describe.skipIf(process.env.SWIFT_FORMAT_TEST !== '1')('packed Swift format configuration', () => {
  const configuration = path.join(workspace, 'node_modules', packageJSON.name, 'swift-format.json');

  async function copySwiftPackage() {
    const directory = await fs.mkdtemp(path.join(workspace, 'swift-consumer-'));
    await fs.cp(path.join(repositoryRoot, 'fixtures/swift-format'), directory, { recursive: true });

    return directory;
  }

  function runSwift(directory: string, args: readonly string[]) {
    return childProcess.spawnSync('swift', args, {
      cwd: directory,
      encoding: 'utf8',
      timeout: 120_000,
    });
  }

  test('builds and lints a clean Swift package using the installed configuration', async () => {
    const directory = await copySwiftPackage();
    const build = runSwift(directory, ['build']);

    expect(build.error).toBeUndefined();
    expect(build).toMatchObject({ status: 0 });

    const lint = runSwift(directory, [
      'format',
      'lint',
      '--strict',
      '-r',
      'Package.swift',
      'Sources',
      '--configuration',
      configuration,
    ]);

    expect(lint.error).toBeUndefined();
    expect(lint).toMatchObject({ status: 0 });
  }, 180_000);

  test('rejects two-space indentation using the installed four-space configuration', async () => {
    const directory = await copySwiftPackage();
    const sourceFile = path.join(directory, 'Sources/FormatExample/main.swift');
    const source = await fs.readFile(sourceFile, 'utf8');
    await fs.writeFile(sourceFile, source.replaceAll('    ', '  '));

    const lint = runSwift(directory, ['format', 'lint', '--strict', sourceFile, '--configuration', configuration]);

    expect(lint.error).toBeUndefined();
    expect(lint).toMatchObject({ status: 1 });
    expect(lint.stderr).toContain('indent');
  }, 180_000);

  test('repairs indentation and leaves an already formatted source unchanged', async () => {
    const directory = await copySwiftPackage();
    const sourceFile = path.join(directory, 'Sources/FormatExample/main.swift');
    const source = await fs.readFile(sourceFile, 'utf8');
    await fs.writeFile(sourceFile, source.replaceAll('    ', '  '));

    const format = runSwift(directory, [
      'format',
      'format',
      '--in-place',
      sourceFile,
      '--configuration',
      configuration,
    ]);

    expect(format.error).toBeUndefined();
    expect(format).toMatchObject({ status: 0 });
    expect(await fs.readFile(sourceFile, 'utf8')).toBe(source);

    const lint = runSwift(directory, ['format', 'lint', '--strict', sourceFile, '--configuration', configuration]);

    expect(lint.error).toBeUndefined();
    expect(lint).toMatchObject({ status: 0 });

    const repeat = runSwift(directory, [
      'format',
      'format',
      '--in-place',
      sourceFile,
      '--configuration',
      configuration,
    ]);

    expect(repeat.error).toBeUndefined();
    expect(repeat).toMatchObject({ status: 0 });
    expect(await fs.readFile(sourceFile, 'utf8')).toBe(source);
  }, 180_000);
});

test('packed package installs the kqc executable and only Swift source artifacts', async () => {
  const installed = path.join(workspace, 'node_modules', packageJSON.name);
  const files = await fs.readdir(path.join(installed, 'swift/SwiftLintChecks'), { recursive: true });
  expect(files).toContain('Package.swift');
  expect(files).toContain('Package.resolved');
  expect(files).toContain('Sources/SwiftLintChecks/SwiftLintChecks.swift');
  expect(files).toContain('Tests/SwiftLintChecksTests/SwiftLintCommandTests.swift');
  expect(files.some(file => file.split(path.sep).includes('.build'))).toBe(false);
  expect(files.some(file => file.split(path.sep).includes('.swiftpm'))).toBe(false);

  const executable = path.join(workspace, 'node_modules/.bin/kqc');
  const help = childProcess.spawnSync(executable, ['--help'], { cwd: workspace, encoding: 'utf8' });
  expect(help.error).toBeUndefined();
  expect(help.status).toBe(0);
  expect(help.stdout).toContain('Usage: kqc swift-lint [paths...]');

  const consumer = childProcess.spawnSync(consumerNode, [path.join(installed, 'dist/cli.js'), 'swift-lint', '--help'], {
    cwd: workspace,
    encoding: 'utf8',
  });

  expect(consumer.error).toBeUndefined();
  expect(consumer.status).toBe(0);
  expect(consumer.stderr).toBe('');
});

describe.skipIf(process.env.SWIFT_LINT_TEST !== '1')('packed Swift lint CLI', () => {
  const cli = path.join(workspace, 'node_modules', packageJSON.name, 'dist/cli.js');

  function lint(directory: string, args: readonly string[] = []) {
    return childProcess.spawnSync(consumerNode, [cli, 'swift-lint', ...args], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 900_000,
    });
  }

  async function consumerDirectory() {
    return fs.mkdtemp(path.join(workspace, 'swift-lint-consumer-'));
  }

  const clean = 'struct Example {\n    let value = 1\n\n    func read() {}\n}\n';
  const invalid = 'struct Example {\n    let value = 1\n    func read() {}\n}\n';

  test('checks the current directory, ignores dependency and hidden sources, and leaves files unchanged', async () => {
    const directory = await consumerDirectory();
    const file = path.join(directory, 'Example.swift');
    await fs.writeFile(file, clean);

    for (const ignored of ['.build', '.hidden', 'node_modules']) {
      await fs.mkdir(path.join(directory, ignored));
      await fs.writeFile(path.join(directory, ignored, 'Ignored.swift'), invalid);
    }

    await fs.writeFile(path.join(directory, 'Ignored.txt'), invalid);
    await fs.symlink(path.join(directory, 'node_modules'), path.join(directory, 'LinkedSources'));
    const result = lint(directory);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(await fs.readFile(file, 'utf8')).toBe(clean);
  }, 960_000);

  test('checks multiple explicit targets with spaces and omits sources outside the targets', async () => {
    const directory = await consumerDirectory();
    await fs.mkdir(path.join(directory, 'Source Files'));
    await fs.writeFile(path.join(directory, 'Source Files/Example.swift'), clean);
    await fs.writeFile(path.join(directory, 'Another Example.swift'), clean);
    await fs.writeFile(path.join(directory, 'Outside.swift'), invalid);
    const result = lint(directory, ['Source Files', 'Another Example.swift']);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  }, 60_000);

  test.each([
    { name: 'member spacing', source: invalid, diagnostic: '[member_spacing]' },
    {
      name: 'multiline chain spacing',
      source: 'let value = Text(\n    "Example"\n).padding()\n',
      diagnostic: '[multiline_chain_spacing]',
    },
    {
      name: 'view body declarations',
      source:
        'struct Example: View {\n    var body: some View {\n        let value = 1\n        Text("\\(value)")\n    }\n}\n',
      diagnostic: '[view_body_declarations]',
    },
    {
      name: 'multiple tries in one do/catch',
      source: 'do { try load(); try save() } catch { reportError(error) }',
      diagnostic: 'Keep at most one plain try expression in each do/catch body.',
    },
    {
      name: 'value-producing tries in one do/catch',
      source: 'do { let result = try save(); try publish(result) } catch { reportError(error) }',
      diagnostic:
        'For a returned value, declare a typed let before do and assign it inside; the catch must exit, rethrow, or assign a fallback before the value is used afterward.',
    },
    {
      name: 'invalid syntax',
      source: 'struct Example {',
      diagnostic: 'Cannot lint Swift source because Swift syntax is invalid.',
    },
  ])(
    'rejects $name and leaves source unchanged',
    async ({ source, diagnostic }) => {
      const directory = await consumerDirectory();
      const file = path.join(directory, 'Example.swift');
      await fs.writeFile(file, source);
      const result = lint(directory, ['Example.swift']);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout).toContain(diagnostic);
      expect(result.stdout).toContain(file + ':');
      expect(await fs.readFile(file, 'utf8')).toBe(source);
    },
    60_000,
  );

  test('explains individual error handling for extra tries in the installed CLI', async () => {
    const directory = await consumerDirectory();
    const file = path.join(directory, 'Example.swift');
    const source = 'do { try load(); try save() } catch { reportError(error) }';
    await fs.writeFile(file, source);

    const result = lint(directory, ['Example.swift']);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[single_try_per_do_catch]');
    expect(result.stdout).toContain(
      'Give each throwing operation its own do/catch, or extract it into a helper that handles its error.',
    );
    expect(result.stdout).toContain(
      'Choose error handling for each operation rather than combining calls under one try.',
    );
    expect(await fs.readFile(file, 'utf8')).toBe(source);
  }, 60_000);

  test.each([
    {
      name: 'independently handled operations',
      source: `do { try load() } catch { reportLoad(error); return }
do { try save() } catch { reportSave(error) }`,
    },
    {
      name: 'typed declaration before a value-producing try',
      source: `let result: SaveResult
do {
    result = try save()
} catch {
    reportError(error)
    return
}
display(result)`,
    },
  ])(
    'accepts $name without modifying source',
    async ({ source }) => {
      const directory = await consumerDirectory();
      const file = path.join(directory, 'Example.swift');
      await fs.writeFile(file, source);

      const result = lint(directory, ['Example.swift']);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
      expect(await fs.readFile(file, 'utf8')).toBe(source);
    },
    60_000,
  );

  test('fails for a missing target', async () => {
    const directory = await consumerDirectory();
    const result = lint(directory, ['Missing.swift']);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Missing.swift:1:1: error: Cannot lint Swift source:');
  }, 60_000);

  test('succeeds for an empty directory', async () => {
    const directory = await consumerDirectory();
    const result = lint(directory);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  }, 60_000);
});
