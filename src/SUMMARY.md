# Summary

[Cover](cover.md)
[Epigraph](epigraph.md)
[Front Matter](preface.md)
[From the Author](from-the-author.md)

# Part 0: Foundations

- [Why the Rust Compiler Is Different](part0/ch01-why-rust-is-different.md)
- [The rustc Pipeline: From Source to Binary](part0/ch02-pipeline-birds-eye.md)
- [Demand-Driven Compilation: The Query System](part0/ch03-query-system.md)
- [Memory That Lives Forever: Arenas and Interning](part0/ch04-arenas-interning.md)

# Part 1: The Front End

- [Lexical Analysis: From Bytes to Tokens](part1/ch05-lexing.md)
- [Spans and Diagnostics: The Compiler's Sense of Place](part1/ch06-spans-diagnostics.md)
- [Parsing: From Tokens to a Tree](part1/ch07-parsing-ast.md)
- [Macros: Code That Writes Code](part1/ch08-macros-expansion.md)
- [Name Resolution: What Does That Name Refer To?](part1/ch09-name-resolution.md)

# Part 2: The Middle End

- [HIR: The High-Level Intermediate Representation](part2/ch10-hir.md)
- [Types and Inference: What the Compiler Knows About Your Values](part2/ch11-type-inference.md)
- [Traits: Abstraction Without a Runtime Bill](part2/ch12-traits-solver.md)
- [THIR and Pattern Matching: Have You Covered Every Case?](part2/ch13-thir-exhaustiveness.md)
- [MIR: Rust as a Flowchart](part2/ch14-mir.md)
- [Borrow Checking and the Theory of Ownership](part2/ch15-borrow-checking.md)
- [MIR Optimizations and Const Eval: When the Compiler Runs Your Code for You](part2/ch16-mir-opt-const-eval.md)

# Part 3: The Back End

- [Monomorphization: From Generic to Concrete](part3/ch17-monomorphization.md)
- [The Codegen Abstraction: One Frontend, Many Backends](part3/ch18-codegen-abstraction.md)
- [The LLVM Backend: Into LLVM IR](part3/ch19-llvm-backend.md)
- [Alternative Backends: When You Don't Want LLVM](part3/ch20-alt-backends.md)
- [Linking: From Object Files to an Executable](part3/ch21-linking.md)

# Part 4: Cross-Cutting Concerns

- [Incremental Compilation: Remembering What You Did](part4/ch22-incremental.md)
- [Parallel Compilation: Using All the Cores](part4/ch23-parallel.md)
- [Diagnostics and Lints: The Compiler That Teaches](part4/ch24-diagnostics-lints.md)

# Part 5: The Contributor's Practicum

- [Setting Up to Hack on rustc](part5/ch25-setup.md)
- [The Guided Capstone: From Issue to Merge](part5/ch26-capstone.md)

# Appendices

- [Appendices A–D](appendices.md)
- [Glossary](glossary.md)
