import SwiftSyntax

final class SingleTryPerDoCatchVisitor: SyntaxVisitor {
    private(set) var violations: [LintViolation] = []
    private var bodiesWithTry: Set<SyntaxIdentifier> = []

    override func visit(_ node: TryExprSyntax) -> SyntaxVisitorContinueKind {
        guard node.questionOrExclamationMark == nil else { return .visitChildren }
        var ancestor = node.parent
        while let current = ancestor {
            if current.is(ClosureExprSyntax.self) || current.is(FunctionDeclSyntax.self)
                || current.is(MemberBlockSyntax.self) || current.is(AccessorBlockSyntax.self)
            {
                return .visitChildren
            }
            if let body = current.as(CodeBlockSyntax.self),
                let statement = body.parent?.as(DoStmtSyntax.self),
                !statement.catchClauses.isEmpty
            {
                if !bodiesWithTry.insert(body.id).inserted {
                    violations.append(
                        LintViolation(
                            position: node.tryKeyword.positionAfterSkippingLeadingTrivia,
                            rule: .singleTryPerDoCatch
                        )
                    )
                }
                return .visitChildren
            }
            ancestor = current.parent
        }
        return .visitChildren
    }
}
