## Preface

There is no shortage of compiler books. The classics teach you lexing, parsing, type checking, intermediate representations, and code generation using small didactic languages and idealized pipelines. But there is a gap between *a* compiler and *the* compiler you actually use, and that gap is where most of the interesting engineering lives.

`rustc` is one of the most sophisticated production compilers ever built in the open, and it differs from the textbook picture in ways that are not incidental: they are the whole point. Its pipeline runs *backward and on demand*, pulled by a query system rather than pushed by a driver. Its central job is not translation but *proof*: before it emits a single instruction, it must convince itself that your program respects ownership, borrowing, lifetimes, and an elaborate type and trait system.

The single idea that makes the rest of this book make sense: `rustc` is a prover that becomes a translator, and the bridge between the two is a ladder of intermediate representations. Source climbs down that ladder one rung at a time, and each rung exists because some analysis is natural there and awkward everywhere else. Understand the rungs and `rustc` stops looking like an impenetrable monolith.

Every chapter grounds classic theory in real `rustc` source, ends with a hands-on lab where you build a working miniature, and the book closes by walking one real `E-mentor` contribution through the open-source process end to end.

Compiler textbooks teach the durable theory on pedagogical languages; the `rustc-dev-guide` carries the current, authoritative state of the code the way a wiki does. This book fills the gap neither tries to fill: a single cover-to-cover narrative of `rustc` in particular, organized around the proof obligation that bends the pipeline, ending in Part 5 with a real pull request to `rust-lang/rust`. Read it to understand the architecture and arrive at the contribution; keep the dev-guide open for the exact commands and signatures the architecture lives on.

### A word on accuracy and time

`rustc` changes constantly. By the time you read this, some crate may have been renamed, some module reorganized, some algorithm replaced (the trait solver and borrow checker are under active evolution even now). This book aims to teach the *architecture and the why*, the things that change slowly, and to be honest about the things that change fast. When a detail is current-as-of-writing and likely to drift, it says so. When you need the exact present-day truth, the `rustc-dev-guide` is the authoritative companion, and this book repeatedly points you to it. Treat the two together: this book to *understand*, the dev-guide to *act*.

Now, let us begin where the compiler's strangeness begins, with the pipeline that refused to stay straight.

---

## Acknowledgments

This book exists because of work done by people I have never met.

The **rustc Dev Guide** is this book's elder sibling. Every chapter was written with it open in another tab. The contributors who maintain it, named and unnamed, did the patient work that made it possible for an outsider to write this book at all.

The **rust-lang/rust contributors** wrote the compiler this book describes. The list below maps a representative sample to the subsystems this book leans on most directly. It is far from complete:

- **Niko Matsakis** for regions and the NLL design (Chapter 15), the trait solver foundations (Chapter 12), and the original query rewrite (Chapter 3). Three of the structurally-most-important chapters sit on his work.
- **Felix S. Klock II** (`pnkfelix`) for the NLL implementation and the MIR borrow checker (Chapter 15).
- **Michael Goulet** (`compiler-errors`) and **lcnr** for the next-trait-solver migration this book points readers at (Chapter 12) and the ongoing T-types refactor.
- **Oli Scherer** (`oli-obk`) for const-eval and the MIR const-propagation pass (Chapters 14 and 16).
- **Esteban Küber** and **wg-diagnostics** for the multi-year diagnostic UX work that makes Rust's error messages what Chapters 6 and 24 describe. The book's "compiler that teaches" thesis is theirs.
- **Camille Gillot** for incremental compilation and the parallel-compiler effort (Chapters 22 and 23).
- **Wesley Wiser** for codegen and profiler work (Chapters 17 through 19).
- **Mark Rousskov** for perf infrastructure and release engineering, the substrate every incremental-rebuild experiment in Chapter 22 depends on.
- **Ralf Jung** for Miri, RustBelt, and the unsafe-code-guidelines effort that backs Chapter 16's const-eval discussion and Chapter 15's safety theorem framing.
- The working groups **wg-borrow-check**, **wg-mir-opt**, **wg-traits**, **wg-incr-comp**, **wg-parallel-rustc**, and **wg-perf** for the analyses and infrastructure Parts 2 through 4 lean on; the **GCC-rs**, **rustc_codegen_cranelift**, and **LLVM project** contributors for the alternate and primary backends Part 3 walks.

The list is incomplete by design. The compiler is the product of hundreds of contributors whose names do not appear above, and the working groups absorb the work of many more. This book teaches their compiler.

To the **Rust community**, for treating a book like this as a contribution rather than an intrusion: thank you.

---

## How to Read This Book

Every chapter follows the same four-section rhythm:

1. **X.1 Theoretical Foundation.** The classic compiler idea, motivated from scratch and tied to why Rust needs it.
2. **X.2 Architecture Deep-Dive.** The `rustc` crates, modules, and data structures that implement it.
3. **X.3 Source Walkthrough.** A close reading of representative `rustc` source.
4. **X.4 Hands-On Lab.** You build a working miniature, then a retrospective bridges to the next chapter.

A few conventions:

- **Pro-Tip** blocks share practical wisdom and transferable techniques.
- **Warning** blocks flag traps where intuition misleads.
- **Bold on first use** marks a term being defined.
- **Cross-references** ("the §4.2 interner") are everywhere; follow the threads.
- **Mermaid diagrams**, two or three per section, cover flows, trees, and CFGs.

Read straight through, or, after Part 0, dip into the phase you care about. The prose stands without the labs, but the labs are where understanding becomes yours. Do them if you can.

## What You Need

**To read the book:** working familiarity with Rust. You should be comfortable writing ordinary Rust programs, and recognize ownership, borrowing, traits, and generics as a *user*. You do not need prior compiler experience; the theory is built up from the ground.

**To do the labs:** a stable Rust toolchain (`rustup`, `cargo`). The labs are pure-`std` Rust by design and need nothing else.

**To follow Part 5 (contributing):** a clone of `rust-lang/rust`, the `rustc` build prerequisites (a C/C++ toolchain, Python, CMake, and roughly 30–100 GB of free disk space depending on configuration), and patience for a first build. Chapter 25 walks the entire setup, including the accelerators that keep the edit-build-test loop down to minutes.

**The indispensable companion:** the official `**rustc-dev-guide`** (`rustc-dev-guide.rust-lang.org`). This book teaches the architecture; the dev-guide carries the current, authoritative commands and details. Keep it open.
