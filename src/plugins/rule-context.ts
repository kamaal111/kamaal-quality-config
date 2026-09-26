export interface AstNode {
  type: string;
}

interface RuleFixer {
  replaceText(node: AstNode, text: string): AstNode;
}

interface SourceCode {
  getText(node: AstNode): string;
}

export interface RuleContext {
  sourceCode: SourceCode;
  report(descriptor: { node: AstNode; message: string; fix?: (fixer: RuleFixer) => AstNode }): void;
}
