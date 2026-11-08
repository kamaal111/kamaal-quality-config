import Testing

@testable import SwiftLintChecks

struct SingleTryPerDoCatchTests {
    private static let message = """
        Keep at most one plain try expression in each do/catch body. \
        Give each throwing operation its own do/catch, or extract it into a helper that handles its error. \
        For a returned value, declare a typed let before do and assign it inside; \
        the catch must exit, rethrow, or assign a fallback before the value is used afterward. \
        Choose error handling for each operation rather than combining calls under one try.
        """

    @Test
    func `Reports every extra try at its keyword with actionable guidance`() {
        let source = """
            do {
                try load()
                try save()
                try refresh()
            } catch {
                reportError(error)
            }
            """
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift") == [
                "Example.swift:3:5: error: \(Self.message) [single_try_per_do_catch]",
                "Example.swift:4:5: error: \(Self.message) [single_try_per_do_catch]",
            ]
        )
    }

    @Test(arguments: [
        "do { try load() } catch { reportError(error) }",
        "do { throw Failure.invalid } catch { reportError(error) }",
        "do {} catch { reportError(error) }",
        "do { try load(); try? refresh(); try! reset() } catch { reportError(error) }",
        "do { try await load() } catch { reportError(error) }",
        "do { return try save() } catch { throw error }",
        "do { try combine(load(), save()) } catch { reportError(error) }",
        "try load(); try save()",
        "do { try load(); try save() }",
        "do { try load() } catch { try save(); try refresh() }",
        """
        do {
            try load()
            do { try save() } catch { reportSave(error) }
        } catch { reportLoad(error) }
        """,
        """
        do { try load() } catch { reportLoad(error); return }
        do { try save() } catch { reportSave(error) }
        """,
        """
        let result: SaveResult
        do {
            result = try save()
        } catch {
            reportError(error)
            return
        }
        display(result)
        """,
        """
        let result: SaveResult
        do { result = try save() } catch { result = .cached }
        display(result)
        """,
        """
        do {
            let work = { try load(); try save() }
            func refresh() throws { try load(); try save() }
            struct Worker {
                func run() throws { try load(); try save() }
            }
            try run(work)
        } catch { reportError(error) }
        """,
        #"""
        do {
            let text = "try load(); try save()"
            // try load(); try save()
            /* try load(); try save() */
            try save()
        } catch { reportError(error) }
        """#,
    ])
    func `Accepts independent handling and excluded scopes`(source: String) {
        #expect(SwiftLint.diagnostics(source: source, path: "Example.swift").isEmpty)
    }

    @Test(arguments: [
        """
        do {
            if cached { try loadCache() } else { try loadRemote() }
        } catch { reportError(error) }
        """,
        """
        do {
            switch mode {
            case .cache: try loadCache()
            default: try loadRemote()
            }
        } catch { reportError(error) }
        """,
        """
        do {
            for entry in entries { try load(entry) }
            try save()
        } catch { reportError(error) }
        """,
        """
        do {
            try load()
            do { try save() }
        } catch { reportError(error) }
        """,
        """
        do {
            let result = try save()
            try publish(result)
        } catch { reportError(error) }
        """,
        """
        do {
            try await load()
            try await save()
        } catch { reportError(error) }
        """,
        """
        do {
            try combine(try load(), save())
        } catch { reportError(error) }
        """,
        """
        do {
            #if os(macOS)
                try loadCache()
            #else
                try loadRemote()
            #endif
        } catch { reportError(error) }
        """,
        #"""
        do {
            try load()
            let text = "\(try save())"
        } catch { reportError(error) }
        """#,
    ])
    func `Rejects multiple plain tries across control flow and expressions`(source: String) {
        #expect(SwiftLint.diagnostics(source: source, path: "Example.swift").count == 1)
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift").first?.hasSuffix(
                "\(Self.message) [single_try_per_do_catch]"
            ) == true
        )
    }

    @Test
    func `Checks nested bodies independently without double counting`() {
        let source = """
            do {
                try load()
                do {
                    try save()
                    try publish()
                } catch {
                    reportSave(error)
                }
                try refresh()
            } catch {
                reportLoad(error)
            }
            """
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift") == [
                "Example.swift:5:9: error: \(Self.message) [single_try_per_do_catch]",
                "Example.swift:9:5: error: \(Self.message) [single_try_per_do_catch]",
            ]
        )
    }

    @Test
    func `Counts nested catch operations toward the outer handler`() {
        let source = """
            do {
                try load()
                do {
                    try save()
                } catch {
                    try recover()
                }
            } catch {
                reportError(error)
            }
            """
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift") == [
                "Example.swift:6:9: error: \(Self.message) [single_try_per_do_catch]"
            ]
        )
    }

    @Test(arguments: [
        """
        let work = {
            do { try load(); try save() } catch { reportError(error) }
        }
        """,
        """
        func work() {
            do { try load(); try save() } catch { reportError(error) }
        }
        """,
        """
        do {
            try load()
            let work = {
                do { try load(); try save() } catch { reportError(error) }
            }
        } catch { reportError(error) }
        """,
        """
        do {
            try load()
            func work() {
                do { try load(); try save() } catch { reportError(error) }
            }
        } catch { reportError(error) }
        """,
        """
        do {
            try load()
            struct Worker {
                func run() {
                    do { try load(); try save() } catch { reportError(error) }
                }
            }
        } catch { reportError(error) }
        """,
    ])
    func `Checks handlers inside separate execution scopes`(source: String) {
        #expect(SwiftLint.diagnostics(source: source, path: "Example.swift").count == 1)
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift").first?.hasSuffix(
                "[single_try_per_do_catch]"
            ) == true
        )
    }

    @Test
    func `Preserves diagnostic source order across rules`() {
        let source = """
            do {
                try load()
                try save()
            } catch { reportError(error) }
            struct Example {
                let value = 1
                func read() {}
            }
            """
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift") == [
                "Example.swift:3:5: error: \(Self.message) [single_try_per_do_catch]",
                "Example.swift:7:5: error: Separate initializers and methods from adjacent members with a blank line. [member_spacing]",
            ]
        )
    }

    @Test
    func `Reports keyword locations with Windows line endings`() {
        let source = "do {\r\n    try load()\r\n    try save()\r\n} catch { reportError(error) }"
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift") == [
                "Example.swift:3:5: error: \(Self.message) [single_try_per_do_catch]"
            ]
        )
    }

    @Test
    func `Preserves invalid source diagnostics`() {
        #expect(
            SwiftLint.diagnostics(source: "do { try load(); try save()", path: "Broken.swift") == [
                "Broken.swift:1:1: error: Cannot lint Swift source because Swift syntax is invalid."
            ]
        )
    }
}
