import Foundation

struct SwiftLintReport {
    let diagnostics: [String]

    var status: Int32 { diagnostics.isEmpty ? 0 : 1 }
}

enum SwiftLintCommand {
    static func run(paths: [String]) -> SwiftLintReport {
        guard !paths.isEmpty else {
            return SwiftLintReport(diagnostics: ["error: Usage: kqc-swift-lint <file-or-directory> ..."])
        }
        var diagnostics: [String] = []
        for path in paths {
            do {
                for file in try swiftFiles(at: URL(fileURLWithPath: path)) {
                    let source = try String(contentsOf: file, encoding: .utf8)
                    diagnostics += SwiftLint.diagnostics(source: source, path: file.path)
                }
            } catch {
                diagnostics.append("\(path):1:1: error: Cannot lint Swift source: \(error.localizedDescription)")
            }
        }
        return SwiftLintReport(diagnostics: diagnostics)
    }

    private static func swiftFiles(at url: URL) throws -> [URL] {
        let values = try url.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
        if values.isSymbolicLink == true { return [] }
        if values.isDirectory == true
            && (url.lastPathComponent.hasPrefix(".") && url.lastPathComponent != "."
                || url.lastPathComponent == "node_modules")
        {
            return []
        }
        guard values.isDirectory == true else {
            return url.pathExtension == "swift" ? [url] : []
        }
        let children = try FileManager.default.contentsOfDirectory(
            at: url,
            includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey],
            options: [.skipsHiddenFiles]
        )
        return try children.sorted { $0.path < $1.path }.flatMap { try swiftFiles(at: $0) }
    }
}
