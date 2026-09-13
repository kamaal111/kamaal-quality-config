import antiSlopPlugin from '@kamaal111/oxlint-plugin-anti-slop';
import { defineConfig } from 'oxlint';

const antiSlopRules = Object.fromEntries(
  Object.keys(antiSlopPlugin.rules).map(ruleName => [`anti-slop/${ruleName}`, 'error'] as const),
);

export default defineConfig({
  plugins: ['typescript', 'unicorn', 'oxc'],
  jsPlugins: [
    { name: 'anti-slop', specifier: '@kamaal111/oxlint-plugin-anti-slop' },
    { name: 'import-js', specifier: 'eslint-plugin-import' },
  ],
  options: { typeAware: true },
  categories: { correctness: 'error' },
  rules: {
    ...antiSlopRules,
    curly: 'error',
    'typescript/no-deprecated': 'error',
    'typescript/consistent-type-imports': 'error',
    'typescript/no-non-null-assertion': 'error',
    'typescript/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    'oxc/no-accumulating-spread': 'error',
    'anti-slop/no-runtime-typeof': ['error', { allowInTypeGuards: true }],
    'import-js/order': [
      'error',
      {
        groups: ['builtin', 'external', ['internal', 'parent', 'sibling', 'index']],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
  env: { builtin: true },
});
