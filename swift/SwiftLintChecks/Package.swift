// swift-tools-version: 6.4

import PackageDescription

let package = Package(
    name: "SwiftLintChecks",
    platforms: [.macOS(.v15)],
    products: [.executable(name: "kqc-swift-lint", targets: ["SwiftLintChecks"])],
    dependencies: [
        .package(url: "https://github.com/swiftlang/swift-syntax", exact: "604.0.0")
    ],
    targets: [
        .executableTarget(
            name: "SwiftLintChecks",
            dependencies: [
                .product(name: "SwiftSyntax", package: "swift-syntax"),
                .product(name: "SwiftParser", package: "swift-syntax"),
            ]
        ),
        .testTarget(name: "SwiftLintChecksTests", dependencies: ["SwiftLintChecks"]),
    ]
)
