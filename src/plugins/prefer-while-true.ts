import type { AstNode, RuleContext } from './rule-context.ts';

interface ForStatementNode extends AstNode {
  type: 'ForStatement';
  init: AstNode | null;
  test: AstNode | null;
  update: AstNode | null;
  range: [number, number];
}

export default {
  meta: { name: 'kamaal-loops' },
  rules: {
    'prefer-while-true': {
      meta: { type: 'suggestion', fixable: 'code' },
      create(context: RuleContext) {
        return {
          ForStatement(node: ForStatementNode) {
            if (node.init !== null || node.test !== null || node.update !== null) {
              return;
            }

            const header = /^for\s*\(\s*;\s*;\s*\)/u.exec(context.sourceCode.getText(node))?.[0];

            context.report({
              node,
              message: 'Use while (true) instead of for (;;).',
              fix: header
                ? fixer => fixer.replaceTextRange([node.range[0], node.range[0] + header.length], 'while (true)')
                : undefined,
            });
          },
        };
      },
    },
  },
};
