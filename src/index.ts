import antiSlopPlugin from '@kamaal111/oxlint-plugin-anti-slop';
import { defineConfig } from 'oxlint';

const antiSlopRules = Object.fromEntries(
  Object.keys(antiSlopPlugin.rules).map(ruleName => [`anti-slop/${ruleName}`, 'error'] as const),
);

export default defineConfig({
  jsPlugins: [{ name: 'anti-slop', specifier: '@kamaal111/oxlint-plugin-anti-slop' }],
  rules: antiSlopRules,
});
