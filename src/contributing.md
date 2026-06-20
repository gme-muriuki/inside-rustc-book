# Contributing

Thank you for considering a contribution. The book targets `rustc 1.95.0` (commit `59807616e1fa2540724bfbac14d7976d7e4a3860`); `rustc` evolves, and the book will drift unless readers catch what slipped. Eyes on the prose are the most valuable thing you can give.

## Three paths

### Quick: edit this page

Every chapter has a pencil icon at the top of the right rail. Click it. GitHub opens the source file in an editable view. Make your fix, write a short commit message, click "Propose changes." A PR opens in the right place automatically.

Use this for typos, broken links, awkward sentences, or one-line fact corrections.

### Medium: file an issue

Some changes are easier to discuss than to draft. Open an issue and pick one of the templates:

- **Drift report**: a function name, module path, or behavior the book describes no longer matches current `rustc`. Tell us where in the book and what changed.
- **Typo or broken link**: too small to bother PR-ing? Just file the issue and someone (often you) will pick it up.
- **Clarity suggestion**: a passage that confused you. Even if you do not know the fix, the report itself is signal.
- **Site or build bug**: something broke in the rendered book (missing image, quiz will not load, diagram is cut off).

### Deeper: clone and PR

For multi-paragraph rewrites, new diagrams, or anything touching the lab sections:

```bash
git clone https://github.com/gme-muriuki/inside-rustc-book
cd inside-rustc-book

# One-time plugin install
cargo install mdbook mdbook-admonish mdbook-quiz mdbook-pagetoc

# Live preview at http://localhost:3000
mdbook serve --open
```

Edit on a branch, push, open a PR. Cloudflare's preview deploy renders your changes on a preview URL linked from the PR before merge.

## Citation convention

When a passage names a specific `rustc` artifact (function, type, file path, struct field, etc.), cite it as:

```
path/from/repo/root.rs::SymbolName@<short-SHA>
```

Example: `compiler/rustc_middle/src/ty/instance.rs::Instance::resolve_drop_in_place@59807616e1f`.

The short SHA pins the claim to a specific `rustc` commit so future readers can verify the citation has not drifted. The book's current pin is `59807616e1f` (rustc 1.95.0). New citations should reference that pin unless you are explicitly flagging a change at `HEAD`.

## The em-dash rule

The book uses zero em-dashes (`—`, U+2014). They are recast as commas, colons, periods, or parens depending on grammatical role. En-dashes (`–`, U+2013) in numeric ranges stay.

If you submit a PR with em-dashes, a maintainer will silently recast them; you do not need to fix this yourself unless you want to.

## What a great contribution looks like

It does at least one of:

- Pins a citation to a specific `rustc` SHA the reader can grep.
- Shortens a sentence without losing meaning.
- Adds an example that makes an abstract claim concrete.
- Fixes a wrong claim with a real reference to the actual `rustc` source.

It is *not* required to:

- Match the book's voice exactly. A maintainer will polish if needed.
- Add a quiz question. The existing chapter quizzes already cover the main claims.
- Update internal scaffolding. The verify-claims protocol and audit ledger live in a separate workshop repo.

## Code of conduct

This book follows the [Rust Code of Conduct](https://www.rust-lang.org/policies/code-of-conduct). Be kind, assume good intent, correct technically without correcting personally.

## License

By contributing you agree your contribution will be licensed under the same terms as the rest of the book (see `LICENSE` at the repo root).
