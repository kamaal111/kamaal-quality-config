#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const repositoryRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repositoryRoot, 'dist');

const configs = [
  { moduleName: 'oxlint.js', filename: 'dist/oxlintrc.json' },
  { moduleName: 'swift-format.js', filename: 'swift-format.json' },
];

await Promise.all(
  configs.map(async ({ moduleName, filename }) => {
    const module = await import(path.join(distDir, moduleName));
    await fs.writeFile(path.join(repositoryRoot, filename), `${JSON.stringify(module.default, null, 2)}\n`);
  }),
);
