# Glossary

Compiler vocabulary used across the book. First mention of each term in any chapter links here; this page is the canonical definition. Terms are grouped by where they live in the pipeline.

The pipeline shape is: source bytes → tokens → AST → HIR → THIR → MIR → LLVM IR → object code → linked binary. Each rung simplifies the program so the next analysis is tractable; that is the spine the rest of the vocabulary hangs off.

## Intermediate representations

### AST

**Abstract Syntax Tree.** The first tree representation, produced by `rustc_parse` from tokens. Carries surface syntax: `for` loops, `?` operator, closures, macro invocations, exactly as written. Lives in `rustc_ast::ast`. The first pass that does anything more than translate the text reads the AST.

### HIR

**High-level Intermediate Representation.** The AST after macros have run, after names have been resolved, and after a small set of desugarings (a `for` becomes a `loop` + `match` over the iterator protocol; `?` becomes a `match` on `Try`). Lives in `rustc_hir`. Type checking, the trait solver, and many lints read the HIR.

### THIR

**Typed HIR.** A short-lived representation between HIR and MIR. Every expression carries its inferred type and adjustments; every pattern is desugared into the slot/binding form MIR can consume. The exhaustiveness checker runs on THIR.

### MIR

**Mid-level Intermediate Representation.** A control-flow graph of basic blocks connected by terminators (`switchInt`, `call`, `goto`, `return`). The minimum representation on which dataflow analyses (borrow check, liveness, init analysis) are tractable. Lives in `rustc_middle::mir`. The borrow checker (`rustc_borrowck`) runs here.

### LLVM IR

**LLVM's intermediate representation.** What `rustc_codegen_llvm` hands to LLVM. Static single-assignment form with explicit types and undefined-behavior semantics. LLVM optimizes and lowers this to target machine code.

## Identity vocabulary

### DefId

`{ krate: CrateNum, index: DefIndex }`. The compiler's globally-unique identifier for a definition (function, struct, impl, module, etc.). Distinct from `LocalDefId` (which assumes local crate) and `HirId` (which addresses a node inside an item). The query system is keyed on `DefId` and friends.

### LocalDefId

A `DefId` known to live in the current crate. Operations that only make sense locally (reading HIR, asking about MIR) take `LocalDefId` to make that assumption a type-level fact.

### HirId

Addresses a node inside an item: `{ owner: OwnerId, local_id: ItemLocalId }`. `owner` picks the item, `local_id` picks a node within it. Stable across HIR rebuilds.

### CrateNum

A small integer naming a crate inside a compilation session. The local crate is always `LOCAL_CRATE` (`CrateNum::ZERO`); dependencies get sequentially-allocated numbers.

### DefPathHash

A 128-bit hash of a definition's full path. Stable across compilations (deterministic, no allocation order dependence) so it can key the incremental dep-graph.

## The query system

### Query

A pure function from a key to a value, memoized by the compiler. Called by writing `tcx.query_name(key)`; the result is cached, and re-asking returns the cached value. Almost every named phase of `rustc` is exposed as a query.

### TyCtxt (`tcx`)

The **type context.** The handle on the whole compilation that every part of `rustc` carries around. Owns the query system, the arenas, the session, and the resolver. Conventionally bound as `tcx`. Lifetime `'tcx` is the lifetime of the arenas it owns.

### Providers

A struct of function pointers, one per query, that tells the query system how to compute each query's value when it is not cached. Set up at session start via the `rustc_queries!` macro.

### DepNode

A node in the dependency graph; identifies one query call (kind + key). When a query is invoked, the runtime records which other queries it called, and that record becomes the edges between dep-nodes.

### DepGraph

The bipartite graph of dep-nodes and edges built during a compilation. Together with the previous compilation's serialized graph, it drives the red-green algorithm for incremental rebuilds.

### Red-Green algorithm

Incremental compilation's freshness check: a node is *green* (re-used) if all its dependencies are green; *red* (re-execute) if any input changed; *unknown* until probed. Lives in `rustc_query_system::dep_graph`.

### Fingerprint

A 128-bit hash of a query's value. Used to short-circuit downstream re-execution: if a query was re-run but produced a value with the same fingerprint as last time, its dependents stay green.

## Type system

### Ty<'tcx>

The compiler's representation of a type. Interned in the type-context arena; two equal types share the same pointer, so `Ty<'tcx>` comparison is pointer comparison.

### Region

The compiler's representation of a lifetime: a named, anonymous, or erased region of program execution during which a borrow is valid. Lives in `ty::Region<'tcx>`. Borrow checking computes regions; codegen erases them.

### Instance

`{ def: InstanceDef, args: GenericArgsRef<'tcx> }`. A specific monomorphized version of a function: the function itself plus the concrete type arguments. Distinct from `DefId`, which names the generic function before substitution.

### ParamEnv

The set of where-clause obligations in scope at a given point. Affects trait solving: `Vec<T>: Clone` is provable only inside a `ParamEnv` that has `T: Clone`.

## Trait solving

### Obligation

A trait predicate the compiler must discharge: "prove `Vec<T>: Clone` here." The trait solver's job is to walk a queue of obligations and either solve each, defer it, or report an error.

### Coherence

The property that for any (trait, type) pair, at most one `impl` applies. Enforced by the orphan rules. Without coherence, `<Vec<T> as Clone>::clone(v)` would be ambiguous.

### Trait solver

The engine that discharges obligations. Modern `rustc` is migrating from the old "fulfillment context" solver to `rustc_next_trait_solver`, which is more uniform and easier to specify formally.

## Borrow checking

### Borrow checker

`rustc_borrowck`. The pass that proves safe Rust contains no use-after-free, double-free, or aliased-mutation. Runs on MIR via the `mir_borrowck` query.

### NLL

**Non-Lexical Lifetimes.** The modern borrow-check regime: a borrow is live from its creation up to its *last use*, computed over the MIR CFG. Replaced the pre-2018 lexical scheme that treated borrows as living until the end of the enclosing block.

### Polonius

An experimental reimplementation of the region/borrow constraint solver using Datalog. Available behind `-Zpolonius`; not the default. The data structures live alongside the NLL solver in `do_mir_borrowck`.

### Place

A MIR L-value: a path that addresses a memory location (`x`, `*p`, `(*p).field`, `s[i]`). Borrows and moves are tracked per-place.

### BorrowSet

The MIR-level catalog of every `&` and `&mut` in the function. The borrow checker iterates over it during dataflow.

## Monomorphization and codegen

### Monomorphization

Stamping out one concrete copy of a generic function per (type-argument) tuple that calls it. Done by `rustc_monomorphize`'s collector, which walks the call graph from `main` (and roots like `#[no_mangle]`).

### MonoItem

A single chunk of code to emit: `MonoItem::Fn(Instance)`, `MonoItem::Static(DefId)`, or `MonoItem::GlobalAsm(ItemId)`. The collector returns a set of these; the partitioner groups them into CGUs.

### CGU

**Codegen Unit.** A bundle of `MonoItem`s handed to LLVM as a single translation unit. Choosing CGU boundaries trades parallelism (more CGUs compile faster) against optimization (fewer CGUs inline more aggressively).

### Linkage

How a symbol is exposed to the linker: internal, weak, external, etc. Set per-MonoItem during codegen.

## Macros and expansion

### Macro expansion

`rustc_expand` walks the AST, invokes each macro on its token-tree argument, splices the result back in, and re-runs name resolution. Interleaves with resolution because expansions can introduce new names.

### Hygiene

The property that names introduced by a macro do not accidentally collide with names from the call site, and vice versa. Tracked via `SyntaxContext` on every `Span`.

### SyntaxContext

The "color" of a name, used by hygiene: same color means same expansion environment. `apply_mark` flips the color when crossing an expansion boundary.

### Token tree

The macro-input representation: a flat sequence of `Token`s and balanced `Delimited` groups. Macros consume and produce token trees; the parser is invoked again on the result.

## Diagnostics and lints

### Span

A range in the source code with line/column information and a hygiene context. Every AST/HIR/MIR node carries one. Lives in `rustc_span`.

### Diag

`Diag<'a, G>`. The diagnostic builder. Created via `tcx.dcx().struct_err(...)` or similar; carries the message, spans, sub-diagnostics, and suggestions; finalized by `.emit()`. Replaced the older `DiagnosticBuilder` name.

### ErrorGuaranteed

A zero-sized witness that an error has been emitted. Functions that consume an `ErrorGuaranteed` can soundly assume some earlier pass already failed; this lets later passes return early without producing follow-on noise.

### MultiSpan

A `Span` plus zero or more labeled secondary spans. Used when a diagnostic points at several pieces of code (definition site + use site + suggestion site).

### Lint

A diagnostic that the user can opt in or out of via `#[allow(...)]` / `#[warn(...)]` / `#[deny(...)]` / `#[forbid(...)]`. Distinct from errors, which always fire.

## Arenas and interning

### Arena

A region of memory whose objects are freed together at the end of compilation. `rustc` uses many: one for `Ty`, one for `Const`, one for HIR bodies, etc. Lifetime `'tcx` is the arena lifetime; everything that points into an arena carries it.

### `'tcx` lifetime

The lifetime parameter on almost everything in `rustc` ("for the lifetime of the type context"). Marks a reference that points into one of the compiler's arenas, valid for the rest of compilation.

### Interner

The structure that ensures one canonical copy of each interned value. For `Ty<'tcx>`: an `InternedInSet<WithCachedTypeInfo<TyKind<'tcx>>>` in a `ShardedHashMap`. Equality becomes pointer-equality; hashing becomes pointer-hashing.

### InternedInSet

`InternedInSet<'a, T>(&'a T)`. The wrapper that lets a hash set store references into an arena while deduplicating by *value*. Implements `Borrow<T>` so lookups can be done without first allocating.

## Contributing

### bors

The merge bot for `rust-lang/rust`. Comments `@bors r+` queue a PR for the merge train; bors runs the full test suite on the merge commit before pushing to `master`.

### E-mentor

A `rust-lang/rust` issue label indicating a contributor has volunteered to mentor through this fix. The recommended entry point for first-time contributions.

### CI

`rust-lang/rust`'s continuous integration. Runs the test suite across targets on every PR; bors's merge run is a stricter superset.
