import SwiftSyntax

final class NoNestedDoCatchVisitor: SyntaxVisitor {
    private(set) var violations: [LintViolation] = []

    override func visit(_ node: DoStmtSyntax) -> SyntaxVisitorContinueKind {
        guard !node.catchClauses.isEmpty else { return .visitChildren }
        var ancestor = node.parent
        while let current = ancestor {
            if current.is(ClosureExprSyntax.self) || current.is(FunctionDeclSyntax.self)
                || current.is(InitializerDeclSyntax.self) || current.is(DeinitializerDeclSyntax.self)
                || current.is(MemberBlockSyntax.self) || current.is(AccessorBlockSyntax.self)
            {
                return .visitChildren
            }
            if let statement = current.as(DoStmtSyntax.self), !statement.catchClauses.isEmpty {
                violations.append(
                    LintViolation(
                        position: node.doKeyword.positionAfterSkippingLeadingTrivia,
                        rule: .noNestedDoCatch
                    )
                )
                return .visitChildren
            }
            ancestor = current.parent
        }
        return .visitChildren
    }
}
