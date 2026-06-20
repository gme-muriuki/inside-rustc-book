*Inside rustc: A Tour of the Rust Compiler*

These appendices are reference companions to the main text. Appendix A defines the vocabulary; Appendix B maps every chapter to the `rustc` crate it describes; Appendix C indexes the key queries and data structures; Appendix D points outward to the living resources that stay current as the compiler evolves.

> ⚠️ **A note on currency:** crate names, module paths, and data-structure definitions are accurate against `rust-lang/rust` around stable Rust 1.94/1.95 (2026), confirmed against the `nightly-rustc` documentation index at the time of writing. The compiler moves; when a name here disagrees with the source you are reading, the source wins, and the `rustc-dev-guide` (Appendix D) is the authority.

## Appendix A. Glossary of `rustc` Terms

**AST (Abstract Syntax Tree)**: the tree produced by the parser, a faithful structural representation of the source as written (Chapter 7). Lives in `rustc_ast`; nodes carry `NodeId`s. Wrapped child nodes use `P<T>` (an owned box).

**Arena**: a bump-allocated region whose contents all live and die together, freed in one stroke when the arena is dropped (Chapter 4). `rustc` allocates most long-lived data in arenas tied to the `'tcx` lifetime, avoiding per-node reference counting or garbage collection.

**Applicability**: the confidence level attached to a diagnostic suggestion (Chapter 24): `MachineApplicable` (safe to auto-apply, what `cargo fix` acts on), `MaybeIncorrect`, `HasPlaceholders`, `Unspecified`.

**Borrow checker**: the analysis that proves no two references violate Rust's aliasing rules and that no reference outlives its referent (Chapter 15). Implemented over MIR in `rustc_borrowck` using non-lexical lifetimes (NLL) and region inference.

**Codegen unit (CGU)**: a partition of a crate's code, generated and optimized independently (and in parallel) by the backend (Chapters 17, 23).

**Coherence**: the property that there is at most one applicable trait implementation for any type, so trait resolution is unambiguous (Chapter 12).

`**DefId*`*: a globally unique, stable identifier for a *definition* (a function, struct, trait, etc.), composed of a crate index and an index within that crate (Chapter 2). `LocalDefId` is the same for definitions in the current crate.

**Demand-driven / query-driven**: the architectural style in which the compiler computes results *on request* and caches them, rather than running fixed passes front-to-back (Chapter 3).

`**DepNode*`*: a node in the incremental dependency graph, identified by a `DepKind` and a session-independent `Fingerprint` (Chapter 22).

`**Diag` / `DiagCtxt**`: the diagnostic *builder* (one structured error, with spans and suggestions) and the central diagnostic *context* that collects and emits them (Chapter 24). A `Diag` must be emitted or cancelled, or it panics (the "destructor bomb").

`**ErrorGuaranteed*`*: a token type returned when an error has been emitted, used to prove at the type level that error reporting has occurred (Chapters 6, 24).

**Fingerprint**: a 128-bit stable hash used to identify and compare incremental-compilation artifacts across sessions (Chapter 22).

**Hygiene**: the property that macro-generated identifiers do not accidentally capture or collide with identifiers at the use site (Chapter 8), tracked via `SyntaxContext` and `ExpnId`.

**HIR (High-level IR)**: the desugared, semantically-oriented tree produced by lowering the AST (Chapter 10). Lives in `rustc_hir`; nodes carry `HirId`s. The form on which type checking operates.

**Instance**: a concrete, fully-substituted version of a (possibly generic) item, the unit of monomorphization (Chapter 17): an `InstanceKind` plus its `GenericArgs`.

**Interning**: storing one canonical copy of a value in a shared table and handing out lightweight references to it, so equality becomes pointer comparison (Chapter 4). `Ty<'tcx>` is interned.

**Lint**: a diagnostic with a user-controllable *level* (`allow`/`warn`/`deny`/`forbid`), for style or likely-incorrect-but-legal code (Chapter 24). Implemented as an `EarlyLintPass` (over the AST) or `LateLintPass` (over the typed HIR).

**Lowering**: translating one IR into a lower one, typically making implicit structure explicit (e.g. AST → HIR desugars `for` into `loop` + `match`; MIR construction makes control flow explicit). The book's central motif (Preface).

**MIR (Mid-level IR)**: a control-flow graph of basic blocks containing simple three-address statements and block terminators (Chapter 14). The form on which borrow checking, dataflow optimization, and const evaluation operate. Lives in `rustc_middle`.

**Monomorphization**: replacing generic code with concrete copies, one per set of type arguments actually used (Chapter 17).

**NLL (Non-Lexical Lifetimes)**: the borrow-checking model in which a reference's region is derived from the control-flow graph (where it is actually used) rather than from lexical scope (Chapter 15).

**Query**: a pure, memoized function from a key to a value, the unit of computation in the query system (Chapter 3). The compiler *is*, essentially, a graph of queries hung off `TyCtxt`.

**Region**: a (possibly inferred) lifetime, used by the borrow checker to reason about how long references are valid (Chapter 15).

**Span**: a compact representation of a location in the source, essentially a byte range plus context, attached to nearly every IR node (Chapter 6). Resolved through the `SourceMap` to a file/line/column for diagnostics.

`**SourceMap`**: the table mapping byte offsets back to source files, lines, and columns; the bridge from a `Span` to a human-readable location (Chapter 6).

**THIR (Typed HIR)**: a fully type-annotated, further-desugared tree used for exhaustiveness checking and as the input to MIR construction (Chapter 13).

`**Ty<'tcx>`**: an interned type, represented as a reference into the type interner so that two equal types share one allocation and compare in one instruction (Chapter 4). Its `TyKind` enum enumerates the kinds of types.

`**TyCtxt<'tcx>**` ("the type context," `tcx`): the central, long-lived god-object that owns the arenas, the interners, and the query caches; the database the whole compiler is built around (Chapters 3, 4).

**Trait solver**: the engine that proves trait obligations (does this type implement this trait?), treating traits as propositions and impls as inference rules (Chapter 12). The "next-generation" solver lives in `rustc_next_trait_solver`.

**Unification**: the inference step that makes two types equal by solving for unknown inference variables, the core of Hindley-Milner type inference (Chapter 11).

  


---

  


## Appendix B. The Crate Map: Every Chapter to Its Crate

`rustc` is a workspace of many `rustc_*` crates under `compiler/`. This table connects the book's chapters to the crates that implement them, so an issue's symptom leads you to a location (the thesis of Chapter 26). Crate names verified against the `nightly-rustc` index at the time of writing.


| Phase / Concern                               | Primary crate(s)                                            | Chapter  |
| --------------------------------------------- | ----------------------------------------------------------- | -------- |
| Driver & compilation orchestration            | `rustc_driver` / `rustc_driver_impl`, `rustc_interface`     | 2        |
| The central context, queries, MIR & type defs | `rustc_middle`                                              | 2, 3, 14 |
| Query engine                                  | `rustc_query_impl`, `rustc_middle::dep_graph`               | 3, 22    |
| Arenas                                        | `rustc_arena`                                               | 4        |
| Interners, types, type IR                     | `rustc_middle` (`ty`), `rustc_type_ir`                      | 4, 11    |
| Lexing                                        | `rustc_lexer`                                               | 5        |
| Spans & source map                            | `rustc_span`                                                | 6        |
| Diagnostics engine & messages                 | `rustc_errors`, `rustc_error_messages`, `rustc_error_codes` | 6, 24    |
| Parsing & the AST                             | `rustc_parse`, `rustc_ast`                                  | 7        |
| Macro expansion                               | `rustc_expand`, `rustc_builtin_macros`                      | 8        |
| Name resolution                               | `rustc_resolve`                                             | 9        |
| AST → HIR lowering                            | `rustc_ast_lowering`, `rustc_hir`                           | 10       |
| Type inference (function bodies)              | `rustc_hir_typeck`, `rustc_infer`                           | 11       |
| Type-system analysis & HIR→`Ty` lowering      | `rustc_hir_analysis`                                        | 11       |
| Trait solving                                 | `rustc_trait_selection`, `rustc_next_trait_solver`          | 12       |
| THIR & pattern/exhaustiveness analysis        | `rustc_mir_build` (THIR), `rustc_pattern_analysis`          | 13       |
| MIR construction                              | `rustc_mir_build`                                           | 14       |
| Borrow checking                               | `rustc_borrowck`                                            | 15       |
| MIR optimization & dataflow                   | `rustc_mir_transform`, `rustc_mir_dataflow`                 | 16       |
| Const evaluation / the interpreter            | `rustc_const_eval`                                          | 16       |
| Monomorphization & collection                 | `rustc_monomorphize`                                        | 17       |
| Backend-agnostic codegen                      | `rustc_codegen_ssa`                                         | 18, 21   |
| LLVM backend                                  | `rustc_codegen_llvm`, `rustc_llvm`                          | 19       |
| Symbol mangling                               | `rustc_symbol_mangling`                                     | 21       |
| Linking                                       | `rustc_codegen_ssa` (`back::link`)                          | 21       |
| Incremental compilation persistence           | `rustc_incremental`                                         | 22       |
| Parallel/thread-safe data structures          | `rustc_data_structures` (`sync`, `sharded`)                 | 23       |
| Lints                                         | `rustc_lint`, `rustc_lint_defs`                             | 24       |


*Notes.* Cranelift and GCC backends (Chapter 20) live outside the main tree under `rustc_codegen_cranelift` and `rustc_codegen_gcc` (the latter via `libgccjit`); they implement the same `rustc_codegen_ssa` traits. `rustc_session` (compiler-wide configuration) and `rustc_target` (target specifications) underpin nearly every phase. `rustc_metadata` handles reading and writing the crate metadata that makes separate compilation possible.

  


---

  


## Appendix C. Query Index and Key Data Structures

### Representative queries

The query system (Chapter 3) exposes hundreds of queries as methods on `TyCtxt`. A representative slice, by phase, showing how the pipeline is woven from on-demand computations:


| Query (illustrative)                        | Returns, roughly                        | Phase  |
| ------------------------------------------- | --------------------------------------- | ------ |
| `hir_crate` / HIR accessors                 | the lowered HIR for the crate / an item | 10     |
| `type_of(def_id)`                           | the `Ty<'tcx>` of a definition          | 11     |
| `typeck(def_id)`                            | the `TypeckResults` for a function body | 11     |
| trait-evaluation queries                    | whether a trait obligation holds        | 12     |
| `thir_body(def_id)`                         | the THIR for a body                     | 13     |
| `mir_built(def_id)`                         | the freshly-constructed MIR             | 14     |
| `mir_borrowck(def_id)`                      | borrow-check results for a body         | 15     |
| `optimized_mir(def_id)`                     | MIR after the optimization pipeline     | 16     |
| `collect_and_partition_mono_items`          | the codegen units                       | 17     |
| `codegen_unit(name)` / codegen entry points | generated code for a CGU                | 18, 19 |


*(Exact query names and signatures are defined by the `rustc_queries!` macro in `rustc_middle` and change between releases; consult the source for the current set.)*

### Key data structures, at a glance

**Identity.** `DefId` (crate-global definition id) · `LocalDefId` (current-crate definition) · `HirId` (a node within an owner's HIR) · `DefPathHash` (a stable, cross-session hash of a definition's path).

**Types.** `Ty<'tcx>` (interned type) wrapping `TyKind` (the kind enum) · `GenericArgs` (the substitutions applied to a generic item) · `TyCtxt<'tcx>` (the context owning it all).

**Front-end trees.** `TokenKind` (lexer tokens) · the `rustc_ast` nodes with `NodeId`s and `P<T>` children · the `rustc_hir` nodes with `HirId`s.

**Inference & traits.** `InferCtxt` (the inference context with its unification table and undo log) · `FnCtxt` (per-body type-checking context) · `Goal` and `EvalCtxt` (the trait solver's obligation and its evaluator) · `Certainty` (yes / maybe / no, roughly).

**MIR.** `Body` (a function's MIR) · `BasicBlock` / `BasicBlockData` (CFG nodes) · `Statement` / `StatementKind` (e.g. `Assign(Place, Rvalue)`) · `Terminator` / `TerminatorKind` (e.g. `SwitchInt`, `Call`, `Return`) · `Place`, `Rvalue`, `Operand` (the three-address pieces) · `Local` (a MIR variable).

**Borrow checking.** region/lifetime variables · the outlives-constraint set · the loan/borrow set · the `RegionInferenceContext`.

**Incremental.** `DepNode` (`DepKind` + `Fingerprint`) · the dependency graph (current + previous + colors) · `QuerySideEffects` (replayed diagnostics).

**Parallel.** `Lock` / `RwLock` (serial-`RefCell` vs parallel-`parking_lot`) · `Sharded<T>` (`Single` or 32 cache-aligned shards) · `WorkerLocal` (per-thread arenas) · `DynSend` / `DynSync`.

**Codegen.** `Instance` (`InstanceKind` + `GenericArgs`) · `CodegenCx` (per-CGU context) · `Builder` (per-block IR builder) · the `BuilderMethods` / `CodegenMethods` backend traits · `FunctionCx` (per-function codegen state).

**Diagnostics.** `Diag` (the builder) wrapping `DiagInner` · `DiagCtxt` (the sink) · the `Emitter` trait with `HumanEmitter` and `JsonEmitter` · `Applicability` · `LintPass` / `EarlyLintPass` / `LateLintPass` and the `LintStore`.

  


---

  


## Appendix D. Further Reading and Community Resources

### The indispensable companions

- **The `rustc` Dev Guide**, `rustc-dev-guide.rust-lang.org`, the official, continuously-updated guide to how `rustc` works and how to contribute. This book's primary companion: use it for the current commands and the present-day state of any subsystem.
- `**nightly-rustc` API docs**, `doc.rust-lang.org/nightly/nightly-rustc/`, generated documentation for every compiler crate, type, and function. The authoritative reference for exact signatures.
- **The Rust Reference**, `doc.rust-lang.org/reference/`, the language specification the compiler implements.

### Foundational texts

- **Aho, Lam, Sethi, Ullman, *Compilers: Principles, Techniques, and Tools*** (the "Dragon Book"). The classic theory this book maps onto `rustc`.
- **Appel, *Modern Compiler Implementation*** and **Cooper & Torczon, *Engineering a Compiler***. Excellent complements on IRs, dataflow, and back-end engineering.
- **Pierce, *Types and Programming Languages* (TAPL)**. The reference for the type-theory foundations behind Chapters 11–13.

### On the ideas behind specific subsystems

- The **non-lexical lifetimes** RFC and the **Polonius** project, for the present and future of borrow checking (Chapter 15).
- The **next-generation trait solver** working-group notes, for Chapter 12.
- The **v0 symbol-mangling** RFC (RFC 2603), for Chapter 21.
- The Rust blog posts on the **parallel front end** and on **incremental compilation**, for Chapters 22–23.
- **Salsa**, the standalone incremental-computation framework, as a clean study of the ideas `rustc`'s query system embodies (Chapter 3), noting that `rustc` does *not* use Salsa, but shares its principles.

### Where the community is

The Rust project is a federation of working groups, public channels, and an unusually patient mentoring culture. The venues that matter, and how to use them:

#### Chat and forums

- **Zulip, the `t-compiler` stream**, `rust-lang.zulipchat.com`. The main hub for compiler development discussion. The `#t-compiler/help` stream is explicitly welcoming to newcomers; the working-group streams (`#t-types`, `#wg-mir-opt`, `#wg-borrow-check`, `#wg-parallel-rustc`, `#wg-diagnostics`, and others) are where the actual subsystem work happens. Each chapter of this book has a stream where its subject is being discussed in real time.
- **The Rust Internals forum**, `internals.rust-lang.org`. Asynchronous, threaded discussion of compiler-and-language internals: RFC proposals, design tradeoffs, deeper architectural conversations. The home of "let's think about this for a while."
- **The Rust Users forum**, `users.rust-lang.org`. For Rust-using questions, not internals; useful when the subject straddles "I'm trying to do X with rustc" and "I'm trying to write X in Rust."
- `**/r/rust`** on Reddit, and the unofficial Rust Discord servers, for casual discussion. Not the venue for serious compiler-engineering work, but useful for the temperature of the community at large.

#### Issue tracker and working groups

- **The `rust-lang/rust` issue tracker**, `github.com/rust-lang/rust/issues`. The first-contribution labels are `E-mentor`, `E-easy`, and `E-needs-test` (Chapter 25 details how to filter them).
- **Working groups (`wg-*`)** organize around long-running technical areas: `wg-borrow-check`, `wg-mir-opt`, `wg-traits`, `wg-diagnostics`, `wg-parallel-rustc`, `wg-incr-comp`, `wg-perf`. Each runs in a Zulip stream and tracks a roadmap in a GitHub project. To engage with a chapter's subsystem in depth, find its working group.
- **Clippy**, `github.com/rust-lang/rust-clippy`, built on the same `LintPass` framework (Chapter 24) and famous for its newcomer-friendly onboarding; an excellent first project.

#### Conferences and blogs

- **RustConf, Rust Nation, RustNL, EuroRust**, the principal in-person conferences. Compiler talks happen here regularly; recordings live on the conferences' YouTube channels.
- `**This Week in Rust`**, `this-week-in-rust.org`, the weekly digest of language and ecosystem news. Includes a "Call for participation" section.
- **The Inside Rust blog**, `blog.rust-lang.org/inside-rust`, posts from the working groups about progress, RFCs landing, and design discussions.
- **Niko Matsakis's blog**, `smallcultfollowing.com/babysteps`, for borrow checker, trait solver, async, and unsafe-code-guidelines deep dives. The single most influential individual blog on rustc's design.

### How to engage

A few practical tips, learned the hard way by many before you, for joining the community as a contributor rather than just a reader.

**Introducing yourself.** Your first Zulip message in `#t-compiler/help` does not need a long backstory: "Hi, I'm interested in working on $area and trying to learn the codebase" is enough. Mentors do not need your résumé; they need to know what you are trying to do and what you have already tried.

**Asking good questions.** Before asking, do three things: read the relevant `rustc-dev-guide` section, search the issue tracker for prior discussions, and try the change in a local build. Then frame your question with context: "I tried X (here's what happened), expected Y, the dev-guide section on Z suggests W is involved, can someone point me at the right code?" A good question is one a busy maintainer can answer in three lines.

**Finding a working group.** Look at this book's chapter-to-subsystem mapping (Appendix B) and find the working group for the subsystem you care about (e.g., borrow checking → `wg-borrow-check`). Subscribe to its Zulip stream and read for a week before posting; the conversation will tell you what is live, what is blocked, and where help is wanted.

**What RFCs are.** Substantive language or compiler changes go through the **RFC process** in `rust-lang/rfcs`. RFCs are written in markdown, debated openly, accepted or closed by the relevant team, and then tracked through implementation as a "tracking issue" on `rust-lang/rust`. Reading recent merged RFCs is the fastest way to understand how the team thinks about a subsystem.

**Finding a mentor.** Mentorship in the Rust project is mostly informal: a maintainer who answers your questions and reviews your first PR becomes, de facto, your mentor. The `E-mentor` label on issues makes this explicit: the issue's "mentor" comment names a maintainer who has volunteered to guide a contribution through. Pick an `E-mentor` issue in an area you care about, comment that you would like to work on it, and you will have a mentor.

### A parting pointer

The single best next step after this book is to *do* the thing Part 5 rehearsed: clone `rust-lang/rust`, pick an `E-mentor` diagnostics issue, write the fix, open the PR, and follow it through review. You have the map; the territory is open, and the people who maintain it are glad you are here.

---

## Was it worth it?

Somewhere in a service shaft, a steel box hangs on cables it cannot inspect, governed by a few kilobytes of firmware that once pointed at the wrong address and stopped. The programmer who took the stairs that morning is the patron saint of this book. Twenty-six chapters later, it is fair to ask what the elaborate machinery just documented has actually bought for the people who maintain such boxes, and at what price.

The price is on every page. A lexer that records spans for diagnostics nobody will read on a good day. Five intermediate representations where one would compile faster. A borrow checker that refuses programs which, in some other dialect, would have run for years without incident. Arenas and interning to keep a graph the size of a small city from melting the heap. A query system whose correctness depends on hashing inputs that a hand-written pass would never have bothered to name. Months of compile time, across the world, every day. The cost is not theoretical; it is the slow build, the fought-with lifetime annotation, the third rewrite of a data structure that finally satisfies the prover.

Against that, a quieter ledger. A class of crash that no longer reaches production, because the only programs that compile are the ones whose memory discipline has already been checked. Code reviews that no longer relitigate who owns what, because the types have settled it before the diff was opened. Data races that the reviewer does not have to imagine, because `Send` and `Sync` imagined them first. Refactors in unfamiliar code that proceed by following the compiler's complaints rather than by reading every caller. None of this is glamorous. Most of it is the absence of an incident report.

Whether the trade is worth it depends on what the code is steering. For a script that will run once, almost certainly not; the proof obligation is overhead the program will never repay. For the firmware on the elevator, for the kernel that schedules it, for the cryptographic library that signs its update, the calculus shifts, and somewhere along that spectrum the ledger flips. The pipeline this book described is the bookkeeping of that flip: a prover patient enough to be a translator, paid for in compile cycles and learning curves, redeemed in bugs that simply do not happen.

Whether the elevator now arrives is a question for the people who write its firmware, and for the languages they choose; the compiler can only refuse to ship the proof it could not find.

---

## About the Author

**James Muriuki Maina** is a compiler-curious Rust developer who learned `rustc` by writing this book about it. The chapters trace the trail he took through the type system, MIR, the borrow checker, and the query graph, in the order he found them tractable. He works on [open source], lives in [Nyeri, Kenya], and reads every PR sent his way at [[james.muriuki.dev@gmail.com](mailto:james.muriuki.dev@gmail.com)] / [@gme-muriuki] on GitHub.

---

*End of appendices. End of* Inside rustc: A Tour of the Rust Compiler.