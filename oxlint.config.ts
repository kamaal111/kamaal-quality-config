import { defineConfig } from 'oxlint';

import kamaalQualityConfig from './src/index.ts';

export default defineConfig({
  extends: [kamaalQualityConfig],
  ignorePatterns: ['.pnpm-store/**', 'dist/**/*'],
});
