# Repository Guidelines

## Build, Test, and Development Commands

Use `pnpm` 12.14.0 (installed with pnpm's standalone script) on Node.js 26.

Run every repository command inside the devcontainer. The host shell is unsupported: use an active
Dev Container terminal or the Dev Containers CLI. Do not invoke the Compose service directly, because
that bypasses the features and post-create setup that install the pinned Node.js and pnpm versions.

If no devcontainer is running, create one yourself without asking the user. From the host, use
`devcontainer up --workspace-folder "$PWD"` (or `npx @devcontainers/cli up --workspace-folder "$PWD"`
when the CLI is not installed). Wait for features and post-create setup to finish, then run commands
with `devcontainer exec --workspace-folder "$PWD" bash -lc 'export PATH="/root/.local/share/pnpm/bin:$PATH"; pnpm quality'`.
Host-side Dev Containers CLI orchestration is permitted; repository commands still run inside the
container. Prefer the standalone pnpm installed by post-create over any image-provided pnpm.

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
- `src/index.ts` exports the root namespace (`oxlint`, `oxfmt`, and `swiftFormat`) and re-exports the named configs.
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
  imports) and extends its `oxlint` member. Plugin subpaths resolve to compiled JavaScript, so
  `pnpm lint` builds `dist/` first. There is no separate hand-maintained `.oxlintrc.json` to keep
  in sync with `src/index.ts`.

- `src/swift-format.ts` owns the shared Swift format settings. The build serializes its compiled
  object to package-root `swift-format.json`; oxlint JSON stays in `dist/`. Never hand-edit either
  generated artifact. The root Swift JSON is ignored by Git and explicitly included in package files.
  Swift consumers pass the installed JSON path to `swift format --configuration`; it does not merge
  local configs. Keep the README's Swift format section in sync with that interface.
- `pnpm test:swift-format` runs the packed-consumer tests with real Swift integration enabled.
  The fixture in `fixtures/swift-format` must build and lint with the installed package's config.
  CI supplies Swift 6.4.1; missing Swift must fail the dedicated command rather than skip coverage.
