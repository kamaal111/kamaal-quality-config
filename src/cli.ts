#!/usr/bin/env node
import childProcess from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import util from 'node:util';

const usage = `Usage: kqc swift-lint [paths...]

Check Swift sources recursively (default: current directory).
Requires Swift 6.4 or newer. Use -- before paths beginning with a dash.
`;

function runSwift(paths: readonly string[]): void {
  const packageDirectory = url.fileURLToPath(new URL('../swift/SwiftLintChecks', import.meta.url));

  const child = childProcess.spawn(
    'swift',
    ['run', '--package-path', packageDirectory, 'kqc-swift-lint', ...paths.map(target => path.resolve(target))],
    { stdio: 'inherit' },
  );

  const interrupt = () => {
    child.kill('SIGINT');
  };

  const terminate = () => {
    child.kill('SIGTERM');
  };

  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);

  child.once('error', error => {
    if ('code' in error && error.code === 'ENOENT') {
      console.error('kqc: Swift 6.4 or newer is required; install it and ensure swift is on PATH.');
      process.exitCode = 127;
    } else {
      console.error(`kqc: Cannot launch Swift: ${error.message}`);
      process.exitCode = 1;
    }
  });
  child.once('close', (code, signal) => {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', terminate);

    if (signal) {
      process.kill(process.pid, signal);
      process.exitCode = 128 + os.constants.signals[signal];
    } else if (code !== null && code >= 0) {
      process.exitCode = code;
    }
  });
}

function parseArguments() {
  try {
    return util.parseArgs({
      options: { help: { type: 'boolean' } },
      allowPositionals: true,
    });
  } catch {
    console.error(usage);
    process.exitCode = 2;

    return undefined;
  }
}

const parsed = parseArguments();

if (parsed !== undefined) {
  const [command, ...paths] = parsed.positionals;

  if (parsed.values.help && paths.length === 0 && (command === undefined || command === 'swift-lint')) {
    console.log(usage);
  } else if (command !== 'swift-lint' || parsed.values.help) {
    console.error(usage);
    process.exitCode = 2;
  } else {
    runSwift(paths.length === 0 ? ['.'] : paths);
  }
}
