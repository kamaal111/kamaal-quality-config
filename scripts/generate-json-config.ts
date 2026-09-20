#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const distDir = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'dist');

const module = await import(path.join(distDir, 'oxlint.js'));

await fs.writeFile(path.join(distDir, 'oxlintrc.json'), `${JSON.stringify(module.default, null, 2)}\n`);
