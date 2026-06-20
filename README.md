# Inside rustc: A Tour of the Rust Compiler

A working tour of `rustc`, the prover that becomes a translator, from the first byte of source to a merged contribution.

By **James Muriuki Maina**.

This is an mdBook. Every chapter follows the same four-section rhythm: theoretical foundation, architecture deep-dive, source walkthrough, hands-on lab. The book is verified against `rustc 1.95.0`.

## Read it

(Public URL goes here once GitHub Pages is set up.)

## Build it locally

You need a Rust toolchain (for `cargo install`) and Python 3 (for two small preprocessors).

```bash
cargo install mdbook mdbook-admonish mdbook-quiz mdbook-pagetoc

git clone <this repo>
cd inside-rustc

mdbook serve --open
```

The first build will print two harmless warnings about `mdbook-admonish` (v1.20.0) and `mdbook-pagetoc` (v0.3.0) being built against a slightly different `mdbook` minor version. The shim at `scripts/admonish-wrap.py` absorbs the actual structural difference; the warnings are cosmetic.

## What's in the box

- `src/` — chapter content (26 chapters across 6 parts, plus preface, cover, glossary, appendices).
- `src/images/diagrams/` — 180 pre-rendered Mermaid SVGs. Source `mermaid` blocks live in the chapter markdown; `scripts/mermaid-to-svg.py` rewrites them to `<img>` references at build time. If you change a diagram, regenerate the SVG: `python scripts/render-mermaid.py <changed-chapter.md> --force --config scripts/mmdc-themed.json`.
- `quizzes/` — one TOML per chapter, consumed by `mdbook-quiz`.
- `theme/` — custom CSS and JS (admonish overrides, pagetoc tweaks, glossary tooltips, diagram zoom, reading-time, quiz progress, syntax palette).
- `scripts/admonish-wrap.py`, `scripts/mermaid-to-svg.py` — Python preprocessors `book.toml` calls at build.

## Contribute

The book is verified against `rustc 1.95.0` (commit `59807616e1fa2540724bfbac14d7976d7e4a3860`). `rustc` evolves; drift is inevitable. If you spot:

- A symbol the book describes that has been renamed, moved, or removed,
- A passage that no longer reflects current `rustc` behavior,
- A typo, broken link, or unclear explanation,

please open an issue or PR. See `src/contributing.md` (link added once the page is written) for the contribution workflow, citation convention (`path::symbol@SHA`), and the no-em-dash style rule the book enforces.

## License

See `LICENSE`.
