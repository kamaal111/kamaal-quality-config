import { defineConfig } from 'oxfmt';

import kamaalOxfmtStyle from './src/oxfmt.ts';

export default defineConfig({
  ...kamaalOxfmtStyle,
  ignorePatterns: ['.pnpm-store/**', 'dist', 'pnpm-lock.yaml', '.env'],
});
