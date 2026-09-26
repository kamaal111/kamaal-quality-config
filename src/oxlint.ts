import antiSlopPlugin from '@kamaal111/oxlint-plugin-anti-slop';
import { defineConfig } from 'oxlint';

import consistentInlineTypeImportsPlugin from './plugins/consistent-inline-type-imports.ts';
import noNullishCheckFirstTernaryPlugin from './plugins/no-nullish-check-first-ternary.ts';

function pluginRules(namespace: string, ruleNames: string[]) {
  return Object.fromEntries(ruleNames.map(ruleName => [`${namespace}/${ruleName}`, 'error'] as const));
}

const antiSlopRules = pluginRules('anti-slop', Object.keys(antiSlopPlugin.rules));

const consistentInlineTypeImportsRules = pluginRules(
  consistentInlineTypeImportsPlugin.meta.name,
  Object.keys(consistentInlineTypeImportsPlugin.rules),
);

const noNullishCheckFirstTernaryRules = pluginRules(
  noNullishCheckFirstTernaryPlugin.meta.name,
  Object.keys(noNullishCheckFirstTernaryPlugin.rules),
);

export default defineConfig({
  plugins: ['typescript', 'unicorn', 'oxc', 'vitest'],
  jsPlugins: [
    { name: 'anti-slop', specifier: '@kamaal111/oxlint-plugin-anti-slop' },
    { name: 'import-js', specifier: 'eslint-plugin-import' },
    {
      name: consistentInlineTypeImportsPlugin.meta.name,
      specifier: '@kamaal111/kamaal-quality-config/plugins/consistent-inline-type-imports',
    },
    {
      name: noNullishCheckFirstTernaryPlugin.meta.name,
      specifier: '@kamaal111/kamaal-quality-config/plugins/no-nullish-check-first-ternary',
    },
  ],
  options: { typeAware: true },
  categories: { correctness: 'error' },
  rules: {
    ...antiSlopRules,
    ...consistentInlineTypeImportsRules,
    ...noNullishCheckFirstTernaryRules,
    curly: 'error',
    'typescript/no-deprecated': 'error',
    'typescript/consistent-type-imports': 'error',
    'typescript/no-non-null-assertion': 'error',
    'typescript/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    'typescript/no-explicit-any': 'error',
    'typescript/ban-ts-comment': ['error', { minimumDescriptionLength: 10 }],
    'typescript/no-duplicate-enum-values': 'error',
    'typescript/no-empty-object-type': 'error',
    'typescript/no-extra-non-null-assertion': 'error',
    'typescript/no-misused-new': 'error',
    'typescript/no-namespace': 'error',
    'typescript/no-non-null-asserted-optional-chain': 'error',
    'typescript/no-require-imports': 'error',
    'typescript/no-this-alias': 'error',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-declaration-merging': 'error',
    'typescript/no-unsafe-function-type': 'error',
    'typescript/no-wrapper-object-types': 'error',
    'typescript/prefer-as-const': 'error',
    'typescript/prefer-namespace-keyword': 'error',
    'typescript/triple-slash-reference': 'error',
    'typescript/no-dynamic-delete': 'error',
    'typescript/no-extraneous-class': 'error',
    'typescript/no-invalid-void-type': 'error',
    'typescript/no-non-null-asserted-nullish-coalescing': 'error',
    'typescript/prefer-literal-enum-member': 'error',
    'typescript/unified-signatures': 'error',
    'typescript/adjacent-overload-signatures': 'error',
    'typescript/array-type': 'error',
    'typescript/ban-tslint-comment': 'error',
    'typescript/class-literal-property-style': 'error',
    'typescript/consistent-generic-constructors': 'error',
    'typescript/consistent-indexed-object-style': 'error',
    'typescript/consistent-type-definitions': 'error',
    'typescript/no-confusing-non-null-assertion': 'error',
    'typescript/no-inferrable-types': 'error',
    'typescript/prefer-for-of': 'error',
    'typescript/prefer-function-type': 'error',
    'oxc/no-accumulating-spread': 'error',
    'vitest/no-conditional-expect': 'error',
    'vitest/expect-expect': 'error',
    'anti-slop/no-runtime-typeof': ['error', { allowInTypeGuards: true }],
    'unicorn/no-abusive-eslint-disable': 'error',
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
