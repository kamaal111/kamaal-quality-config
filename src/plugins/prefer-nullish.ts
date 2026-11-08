import type { ESTree, Rule } from '@oxlint/plugins';

function isNamedMember(
  node: ESTree.Node,
): node is ESTree.MemberExpression & { property: Extract<ESTree.Node, { type: 'Identifier' }> } {
  return node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier';
}

function isCall(node: ESTree.Node): node is ESTree.CallExpression {
  return node.type === 'CallExpression';
}

const preferNullish: Rule = {
  meta: { type: 'suggestion' },
  create(context) {
    return {
      CallExpression(node) {
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
};

export default preferNullish;
