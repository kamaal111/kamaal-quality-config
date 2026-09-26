# @kamaal111/kamaal-quality-config

Kamaal Farah's shared [oxlint](https://oxc.rs) quality configs.

Currently enables every rule from [`@kamaal111/oxlint-plugin-anti-slop`](https://github.com/kamaal111/anti-slop),
Kamaal's fork of [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), plus a curated set of
rules from oxlint's built-in `typescript`, `unicorn`, `oxc`, and `vitest` plugins and from
`eslint-plugin-import` (via oxlint's `jsPlugins`), plus two hand-written local rules:

- `kamaal-imports/no-all-inline-type-imports` — forbids `import { type A, type B } from 'x'` in favor
  of a top-level `import type { A, B } from 'x'`.
- `kamaal-ternary/no-nullish-check-first-ternary` — forbids ternaries that check for a nullish value
  first (e.g. `x == null ? undefined : x.trim()`), requiring the value-producing branch first instead
  (`x != null ? x.trim() : undefined`).

More rule sources will be folded in over time.

## Table of contents

- [Install](#install)
- [Usage](#usage)
  - [oxlint](#oxlint)
  - [oxfmt](#oxfmt)
- [Development](#development)

## Install

```sh
pnpm add -D @kamaal111/kamaal-quality-config
```

## Usage

### oxlint

Extend it from your `.oxlintrc.json`:

```jsonc
{
  "extends": ["node_modules/@kamaal111/kamaal-quality-config/dist/oxlintrc.json"],
  // ...the rest of your project's own oxlint config
}
```

The package ships a plain, statically-generated `dist/oxlintrc.json` — no `oxlint.config.ts` or
package-import support is needed, since `.oxlintrc.json`'s `extends` field accepts plain file paths.

Alternatively, if your project already uses `oxlint.config.ts`, import the config directly:

```ts
import kamaalOxlintConfig from '@kamaal111/kamaal-quality-config/oxlint';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [kamaalOxlintConfig],
});
```

The package root also exposes every config through a namespace object:

```ts
import kamaalQuality from '@kamaal111/kamaal-quality-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [kamaalQuality.oxlint],
});
```

Both forms carry the same rules — `dist/oxlintrc.json` is generated from the oxlint config at build
time.

### oxfmt

The package also ships a shared [oxfmt](https://oxc.rs) style config at the `./oxfmt` subpath. Unlike
the oxlint side, this has no JSON form — oxfmt has no `extends` mechanism at all, so the only way to
consume it is from an `oxfmt.config.ts` (oxfmt auto-discovers this file the same way it does
`.oxfmtrc.json`; the two can't coexist in the same directory):

```ts
import kamaalOxfmtStyle from '@kamaal111/kamaal-quality-config/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...kamaalOxfmtStyle,
  ignorePatterns: ['dist', 'pnpm-lock.yaml' /* ...your project's own paths */],
});
```

The same style is also available as `kamaalQuality.oxfmt` from the package-root namespace.

`./oxfmt` exports a plain style object (`printWidth`, `arrowParens`, `singleQuote`) with no
`ignorePatterns` — those are inherently project-specific, so each consumer supplies its own via the
spread above.

If your project calls oxfmt's programmatic API directly (e.g. a script formatting generated output,
rather than the `oxfmt` CLI), there's no file-based auto-discovery to rely on — import your own
`oxfmt.config.ts` and read its `default` export:

```ts
import { format } from 'oxfmt';

const { default: options } = await import(pathToFileURL(path.join(repoRoot, 'oxfmt.config.ts')).href);
const result = await format(filepath, sourceText, options);
```

## Development

```sh
pnpm install
pnpm quality
```
