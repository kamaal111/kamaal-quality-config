import type { AstNode, RuleContext } from './rule-context.ts';

interface TryScope {
  depth: number;
  parent?: TryScope;
}

export default {
  meta: { name: 'kamaal-errors' },
  rules: {
    'no-nested-try': {
      meta: { type: 'suggestion' },
      create(context: RuleContext) {
        let scope: TryScope = { depth: 0 };

        function enterScope() {
          scope = { depth: 0, parent: scope };
        }

        function exitScope() {
          if (scope.parent !== undefined) {
            scope = scope.parent;
          }
        }

        return {
          FunctionDeclaration: enterScope,
          'FunctionDeclaration:exit': exitScope,
          FunctionExpression: enterScope,
          'FunctionExpression:exit': exitScope,
          ArrowFunctionExpression: enterScope,
          'ArrowFunctionExpression:exit': exitScope,
          ClassBody: enterScope,
          'ClassBody:exit': exitScope,
          TryStatement(node: AstNode) {
            if (scope.depth > 0) {
              context.report({
                node,
                message:
                  'Avoid nested try statements. Extract error handling into a helper or use sequential try blocks.',
              });
            }

            scope.depth++;
          },
          'TryStatement:exit'() {
            scope.depth--;
          },
        };
      },
    },
  },
};
