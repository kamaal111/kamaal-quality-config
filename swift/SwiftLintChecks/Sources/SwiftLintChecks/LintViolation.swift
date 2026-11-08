import SwiftSyntax

struct LintViolation {
    let position: AbsolutePosition
    let rule: LintRule
}

enum LintRule: String {
    case memberSpacing = "member_spacing"
    case multilineChainSpacing = "multiline_chain_spacing"
    case noNestedDoCatch = "no_nested_do_catch"
    case singleTryPerDoCatch = "single_try_per_do_catch"
    case viewBodyDeclarations = "view_body_declarations"

    var message: String {
        switch self {
        case .memberSpacing:
            "Separate initializers and methods from adjacent members with a blank line."
        case .multilineChainSpacing:
            "Place each chained call on its own line in a multiline expression."
        case .noNestedDoCatch:
            "Avoid nested do/catch statements. Extract error handling into a helper or use sequential do/catch blocks."
        case .singleTryPerDoCatch:
            """
            Keep at most one plain try expression in each do/catch body. \
            Give each throwing operation its own do/catch, or extract it into a helper that handles its error. \
            For a returned value, declare a typed let before do and assign it inside; \
            the catch must exit, rethrow, or assign a fallback before the value is used afterward. \
            Choose error handling for each operation rather than combining calls under one try.
            """
        case .viewBodyDeclarations:
            "Move local declarations out of SwiftUI body into computed properties or helper functions."
        }
    }
}
