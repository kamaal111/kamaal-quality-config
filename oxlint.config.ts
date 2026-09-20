import { defineConfig } from 'oxlint';

import kamaalQuality from './src/index.ts';

export default defineConfig({
  extends: [kamaalQuality.oxlint],
  ignorePatterns: ['.pnpm-store/**', 'dist/**/*'],
});
