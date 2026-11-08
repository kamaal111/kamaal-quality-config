# @kamaal111/kamaal-quality-config

Kamaal Farah's shared quality configs for [oxlint and oxfmt](https://oxc.rs), Swift format, and custom Swift lint checks.

Currently enables every rule from [`@kamaal111/oxlint-plugin-anti-slop`](https://github.com/kamaal111/anti-slop),
Kamaal's fork of [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), plus a curated set of
rules from oxlint's built-in `typescript`, `unicorn`, `oxc`, and `vitest` plugins and from
`eslint-plugin-import` (via oxlint's `jsPlugins`), plus selected rules from `@stylistic/eslint-plugin` and four hand-written local rules:

- `kamaal-imports/no-all-inline-type-imports` — forbids `import { type A, type B } from 'x'` in favor
  of a top-level `import type { A, B } from 'x'`.
- `kamaal-ternary/no-nullish-check-first-ternary` — forbids ternaries that check for a nullish value
  first (e.g. `x == null ? undefined : x.trim()`), requiring the value-producing branch first instead
  (`x != null ? x.trim() : undefined`).
- `kamaal-zod/prefer-nullish` — requires `.nullish()` instead of consecutive `.nullable()` and
  `.optional()` calls in either order. This syntax-based rule applies to any receiver and has no autofix.
- `kamaal-loops/prefer-while-true` — requires `while (true)` instead of `for (;;)` when all three
  header parts are empty. Autofix replaces comment-free headers; headers containing comments are
  reported without a fix. Other `for` loops are unchanged.

The shared defaults also require blank lines around class methods and constructors (with autofix),
allow consecutive fields to stay grouped, require default imports for `node:` modules, and prohibit
`Object.assign` in favor of explicit typed assignments or object spread. Vitest globals and
project-specific server restrictions remain consumer choices.

More rule sources will be folded in over time.

## Table of contents

- [Install](#install)
- [Usage](#usage)
  - [oxlint](#oxlint)
  - [oxfmt](#oxfmt)
  - [Swift format](#swift-format)
  - [Swift lint](#swift-lint)
- [Development](#development)

## Install

Consumers require Node.js 22.12.0 or newer.

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

### Swift format

The package ships a shared configuration for Swift's built-in formatter. Install the package using
pnpm as above, and install a Swift toolchain separately. From your project's root, run:

```sh
swift format lint --strict -r . \
  --configuration node_modules/@kamaal111/kamaal-quality-config/swift-format.json
```

To format files in place:

```sh
swift format format --in-place -r . \
  --configuration node_modules/@kamaal111/kamaal-quality-config/swift-format.json
```

Paths are relative to your working directory. Swift format does not support `extends`:
`--configuration` selects this complete configuration and does not merge your project's
`.swift-format` file. The shared style uses four-space indentation and a 120-character line limit.

For programmatic consumption, import the same plain object from
`@kamaal111/kamaal-quality-config/swift-format` or use `kamaalQuality.swiftFormat` from the root
namespace. The generated JSON is also exported at the `./swift-format.json` package subpath.

### Swift lint

The package provides `kqc swift-lint` for syntax-based Swift checks. Install a Swift 6.4 or newer
toolchain separately, then run from your project root:

```sh
pnpm exec kqc swift-lint
pnpm exec kqc swift-lint Sources Tests
pnpm exec kqc swift-lint "Source Files/Example.swift"
```

In package scripts, use `"lint:swift": "kqc swift-lint Sources Tests"`. With the package installed
globally, invoke `kqc swift-lint` directly.

Without paths, the command checks the current directory recursively. Explicit file and directory
paths are relative to your working directory. Recursive scanning skips hidden paths (including
`.build`), `node_modules`, symlinks, and non-Swift files. Use `--` before paths starting with a dash.

All three checks are enabled:

- `member_spacing`: separate methods and initializers from adjacent members with a blank line.
- `multiline_chain_spacing`: put each chained call on its own line in multiline expressions.
- `view_body_declarations`: move local `let` and `var` declarations out of SwiftUI
  `var body: some View`, including nested builder closures. Conditional bindings remain allowed.

The CLI runs `swift run --package-path` against the bundled `SwiftLintChecks` package and does not
modify source files. Diagnostics include file, line, column, and rule identifier. Exit codes are
`0` for clean sources, `1` for violations or unreadable/invalid sources, `2` for usage errors,
and `127` when Swift is missing. Swift build failures retain their exit status.

The first invocation may download SwiftSyntax and compile the checker. SwiftPM caches build
artifacts in the installed Swift package's `.build` directory, so that directory must be writable.
Subsequent invocations reuse the build. Run `kqc swift-lint --help` for usage.

## Development

Use the devcontainer with Node.js 26 (as specified in `.nvmrc`) and pnpm 12.14.0.
The development and release runtime is newer than the minimum supported consumer runtime.

```sh
pnpm install
pnpm quality
pnpm test
```

Vitest also checks the packed package. To select a consumer runtime, run
`CONSUMER_NODE=/absolute/path/to/node pnpm test src/packed-consumer.test.ts` inside the devcontainer.
CI selects the latest Node.js 22 release while building and running Vitest on Node.js 26.
The test fixture installs the JS plugins at the consumer project root, where oxlint resolves
the plugin specifiers in the shared configuration.

The dependency-free example package in `fixtures/swift-format` verifies the installed Swift config.
CI's Swift consumer job supplies Swift 6.4.1 and runs `pnpm test:swift-format`: it builds the package,
lints it using the packed npm artifact, rejects two-space indentation, and verifies formatter repair
and idempotence. To run that command locally, Swift must be available inside the devcontainer.
The dedicated command fails if Swift is missing; ordinary `pnpm test` skips only the Swift toolchain
cases while still checking the packed configuration and exports, including on Node.js 22.

Run `pnpm test:swift-lint` with Swift 6.4 or newer available inside the devcontainer to run the
bundled checker regression suites and packed CLI integration tests. CI supplies Swift 6.4.1.
The dedicated command fails if Swift is missing; ordinary tests still verify CLI dispatch,
packaging, and consumer compatibility without requiring Swift.
