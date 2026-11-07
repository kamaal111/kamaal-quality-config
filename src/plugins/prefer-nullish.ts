import type { AstNode, RuleContext } from './rule-context.ts';

interface IdentifierNode extends AstNode {
  type: 'Identifier';
  name: string;
}

interface MemberExpressionNode extends AstNode {
  type: 'MemberExpression';
  computed: boolean;
  object: ExpressionNode;
  property: ExpressionNode;
}

interface CallExpressionNode extends AstNode {
  type: 'CallExpression';
  callee: ExpressionNode;
}

type ExpressionNode = IdentifierNode | MemberExpressionNode | CallExpressionNode | AstNode;

function isNamedMember(node: ExpressionNode): node is MemberExpressionNode & { property: IdentifierNode } {
  return (
    node.type === 'MemberExpression' && 'computed' in node && !node.computed && node.property.type === 'Identifier'
  );
}

function isCall(node: ExpressionNode): node is CallExpressionNode {
  return node.type === 'CallExpression' && 'callee' in node;
}

export default {
  meta: { name: 'kamaal-zod' },
  rules: {
    'prefer-nullish': {
      meta: { type: 'suggestion' },
      create(context: RuleContext) {
        return {
          CallExpression(node: CallExpressionNode) {
            const outer = node.callee;

            if (!isNamedMember(outer) || !isCall(outer.object)) {
              return;
            }

            const inner = outer.object.callee;

            if (!isNamedMember(inner)) {
              return;
            }

            if (
              (outer.property.name === 'optional' && inner.property.name === 'nullable') ||
              (outer.property.name === 'nullable' && inner.property.name === 'optional')
            ) {
              context.report({
                node,
                message: 'Use .nullish() instead of chaining .nullable() and .optional().',
              });
            }
          },
        };
      },
    },
  },
};
