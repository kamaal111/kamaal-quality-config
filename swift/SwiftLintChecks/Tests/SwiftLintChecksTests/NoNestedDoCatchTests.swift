import Testing

@testable import SwiftLintChecks

struct NoNestedDoCatchTests {
    private static let message =
        "Avoid nested do/catch statements. Extract error handling into a helper or use sequential do/catch blocks."

    @Test(arguments: [
        "do { do { try load() } catch { report(error) } } catch { report(error) }",
        "do { try load() } catch { do { try recover() } catch { report(error) } }",
        "do { if ready { do { try load() } catch {} } } catch {}",
        "do { for item in items { do { try load(item) } catch {} } } catch {}",
        "do { do { do { try load() } catch {} } } catch {}",
        """
        do {
            #if os(macOS)
                do { try load() } catch {}
            #else
                load()
            #endif
        } catch {}
        """,
        """
        do {
            #if os(macOS)
                load()
            #else
                do { try load() } catch {}
            #endif
        } catch {}
        """,
    ])
    func `Rejects nesting across handler regions and control flow`(source: String) {
        let diagnostics = SwiftLint.diagnostics(source: source, path: "Example.swift")
        #expect(diagnostics.count == 1)
        #expect(diagnostics.first?.hasSuffix("\(Self.message) [no_nested_do_catch]") == true)
    }

    @Test
    func `Reports every nested handler once at its do keyword`() {
        let source = """
            do {
                do {
                    do { try load() } catch {}
                } catch {}
            } catch {}
            """
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift") == [
                "Example.swift:2:5: error: \(Self.message) [no_nested_do_catch]",
                "Example.swift:3:9: error: \(Self.message) [no_nested_do_catch]",
            ]
        )
    }

    @Test(arguments: [
        "do { try load() } catch { report(error) }",
        "do { try load() } catch {}\ndo { try save() } catch {}",
        "do { do { try load() } catch {} }",
        "do { do { try load() } } catch {}",
        "do { func work() { do { try load() } catch {} } } catch {}",
        "do { let work = { do { try load() } catch {} } } catch {}",
        "do { var value: Int { do { return try load() } catch { return 0 } } } catch {}",
        "do { struct Worker { func work() { do { try load() } catch {} } } } catch {}",
        "do { struct Worker { init() { do { try load() } catch {} } } } catch {}",
        "do { class Worker { deinit { do { try load() } catch {} } } } catch {}",
        "do { struct Worker { var value: Int { do { return try load() } catch { return 0 } } } } catch {}",
        "do { let text = \"do { do {} catch {} } catch {}\"; /* do {} catch {} */ try load() } catch {}",
    ])
    func `Accepts independent handlers and execution scopes`(source: String) {
        #expect(SwiftLint.diagnostics(source: source, path: "Example.swift").isEmpty)
    }

    @Test(arguments: [
        "do { func work() { do { do { try load() } catch {} } catch {} } } catch {}",
        "do { let work = { do { do { try load() } catch {} } catch {} } } catch {}",
        "do { var value: Int { do { do { return try load() } catch {} } catch {} } } catch {}",
        "do { struct Worker { init() { do { do { try load() } catch {} } catch {} } } } catch {}",
        "do { struct Worker { var value: Int { do { do { return try load() } catch {} } catch {} } } } catch {}",
    ])
    func `Still checks handlers within independent scopes`(source: String) {
        let diagnostics = SwiftLint.diagnostics(source: source, path: "Example.swift")
        #expect(diagnostics.count == 1)
        #expect(diagnostics.first?.hasSuffix("[no_nested_do_catch]") == true)
    }

    @Test
    func `Restores the outer scope after a local function`() {
        let source = """
            do {
                func work() { do { try load() } catch {} }
                do { try save() } catch {}
            } catch {}
            """
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift") == [
                "Example.swift:3:5: error: \(Self.message) [no_nested_do_catch]"
            ]
        )
    }

    @Test
    func `Preserves source order alongside single try diagnostics`() {
        let source = """
            do {
                do {
                    try load()
                    try save()
                } catch {}
            } catch {}
            """
        let diagnostics = SwiftLint.diagnostics(source: source, path: "Example.swift")
        #expect(diagnostics.count == 2)
        #expect(diagnostics[0] == "Example.swift:2:5: error: \(Self.message) [no_nested_do_catch]")
        #expect(diagnostics[1].hasPrefix("Example.swift:4:9: error:"))
        #expect(diagnostics[1].hasSuffix("[single_try_per_do_catch]"))
    }

    @Test
    func `Reports keyword positions with Windows line endings`() {
        let source = "do {\r\n    do { try load() } catch {}\r\n} catch {}"
        #expect(
            SwiftLint.diagnostics(source: source, path: "Example.swift") == [
                "Example.swift:2:5: error: \(Self.message) [no_nested_do_catch]"
            ]
        )
    }

    @Test
    func `Preserves invalid syntax errors`() {
        #expect(
            SwiftLint.diagnostics(source: "do { do {", path: "Broken.swift") == [
                "Broken.swift:1:1: error: Cannot lint Swift source because Swift syntax is invalid."
            ]
        )
    }
}
