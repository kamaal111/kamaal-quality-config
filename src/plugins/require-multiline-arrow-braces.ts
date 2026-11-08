import type { AstNode, RuleContext } from './rule-context.ts';

interface ArrowFunctionNode extends AstNode {
  type: 'ArrowFunctionExpression';
  body: AstNode;
  range: [number, number];
  loc: { end: { line: number } };
}

interface MultilineArrow {
  node: ArrowFunctionNode;
  bodyStart: number;
}

function blockBody(arrow: MultilineArrow, arrows: readonly MultilineArrow[], context: RuleContext): string {
  const source = context.sourceCode.getText(arrow.node);
  const insertions: { offset: number; text: string }[] = [];

  for (const candidate of arrows) {
    if (candidate.bodyStart >= arrow.bodyStart && candidate.node.range[1] <= arrow.node.range[1]) {
      insertions.push(
        { offset: candidate.bodyStart, text: ' { return (' },
        { offset: candidate.node.range[1], text: '\n); }' },
      );
    }
  }

  insertions.sort((left, right) => left.offset - right.offset);

  let offset = arrow.bodyStart;
  let result = '';

  for (const insertion of insertions) {
    result += source.slice(offset - arrow.node.range[0], insertion.offset - arrow.node.range[0]) + insertion.text;
    offset = insertion.offset;
  }

  return result;
}

export default {
  meta: { name: 'kamaal-arrows' },
  rules: {
    'require-multiline-arrow-braces': {
      meta: { type: 'suggestion', fixable: 'code' },
      create(context: RuleContext) {
        const arrows: MultilineArrow[] = [];

        return {
          ArrowFunctionExpression(node: ArrowFunctionNode) {
            if (node.body.type === 'BlockStatement' || node.body.type === 'ObjectExpression') {
              return;
            }

            const arrow = context.sourceCode.getTokenBefore(node.body, token => token.value === '=>');

            if (arrow && arrow.loc.end.line !== node.loc.end.line) {
              arrows.push({ node, bodyStart: arrow.range[1] });
            }
          },
          'Program:exit'() {
            for (const arrow of arrows) {
              context.report({
                node: arrow.node,
                message: 'Use braces and an explicit return for multiline arrow bodies.',
                fix(fixer) {
                  return fixer.replaceTextRange(
                    [arrow.bodyStart, arrow.node.range[1]],
                    blockBody(arrow, arrows, context),
                  );
                },
              });
            }
          },
        };
      },
    },
  },
};
