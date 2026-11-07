import Foundation

@main
private enum SwiftLintChecks {
    static func main() {
        let report = SwiftLintCommand.run(paths: Array(CommandLine.arguments.dropFirst()))
        for diagnostic in report.diagnostics {
            print(diagnostic)
        }
        exit(report.status)
    }
}
