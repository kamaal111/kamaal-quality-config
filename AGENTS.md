# Repository Guidelines

## Build, Test, and Development Commands

Use `pnpm` 12.4.1 (installed with pnpm's standalone script) on Node.js 26.

Run every repository command inside the devcontainer. The host shell is unsupported: use an active
Dev Container terminal or the Dev Containers CLI. Do not invoke the Compose service directly, because
that bypasses the features and post-create setup that install the pinned Node.js and pnpm versions.

- `pnpm install`: install dependencies from the lockfile.
- `pnpm build`: compile TypeScript to `dist/`.
- `pnpm clean:build`: remove `dist/` and rebuild.
- `pnpm lint` and `pnpm format:check`: enforce oxlint and oxfmt rules.
- `pnpm type-check`: type-check without emitting.
- `pnpm quality`: the local quality gate (lint, format check, type check).
- `pnpm release <version>`: publish to npm (CI only, driven by a pushed tag).

## Conventions

- Everything is TypeScript.
- `src/oxlint.ts` builds the oxlint config object, not a rule implementation — the actual rules live in
  `@kamaal111/oxlint-plugin-anti-slop`. The rule map is generated from `Object.keys(antiSlopPlugin.rules)`,
  so every rule the anti-slop plugin exports is enabled by default. Do not hardcode individual rule
  names — bumping the `@kamaal111/oxlint-plugin-anti-slop` dependency is enough to pick up new rules.
- `src/index.ts` exports the root namespace (`oxlint` and `oxfmt`) and re-exports both named configs.
- `pnpm build` also runs `scripts/generate-json-config.ts`, which imports the built `dist/oxlint.js`
  config object and serializes it to `dist/oxlintrc.json`. This is the primary consumption artifact:
  it lets consumers use plain `.oxlintrc.json` `extends` (file paths only, no package imports)
  instead of needing `oxlint.config.ts`. Keep both in sync — they're generated from the same object,
  so don't hand-edit `dist/oxlintrc.json` or let the generation script drift from `src/oxlint.ts`'s shape.
- `src/oxfmt.ts` exports the shared oxfmt style object at the `./oxfmt` subpath. oxfmt has no
  `extends`/shareable-config mechanism at all (checked its `configuration_schema.json` — no such
  field), so unlike oxlint there is no JSON form of this and none should be added; consumers can only
  use it from an `oxfmt.config.ts` (`import kamaalOxfmtStyle from '@kamaal111/kamaal-quality-config/oxfmt'`,
  spread it, add their own `ignorePatterns`). Documented in `README.md`'s "oxfmt" section — keep that
  section in sync with `src/oxfmt.ts`'s exported shape.
- More rule sources (plugins/config blocks) will be added over time; keep each one additive and
  keep deriving rule lists from the source plugin rather than hand-copying rule names, where possible.
- The repo lints itself via `oxlint.config.ts` at the root, which imports `./src/index.ts` directly
  (with the explicit `.ts` extension — oxlint's config loader can't resolve extensionless relative
  imports) and extends its `oxlint` member. This runs against the uncompiled source, so there's no need to build
  `dist/` first and no separate hand-maintained `.oxlintrc.json` to keep in sync with `src/index.ts`.
