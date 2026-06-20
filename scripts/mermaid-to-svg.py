#!/usr/bin/env python3
"""mdBook preprocessor: swap ```mermaid``` blocks for <img> SVG figures.

Source markdown keeps ```mermaid``` blocks as the source of truth.
This preprocessor rewrites each block to an `<img src="...svg">` figure
wrapped with a `<figcaption>` driven by the diagram's accTitle directive.

Why <img> (not <object> nor inline <svg>)?
    The themed config (scripts/mmdc-themed.json) sets htmlLabels:false, so the
    rendered SVGs use native <text>/<tspan> labels and contain ZERO
    <foreignObject> elements. That removes the only reason to prefer <object>:
    - <object data="file.svg">: behaves like a nested browsing context. With a
      percentage-width SVG inside, the object lays out at the SVG's full height
      and ignores a CSS `max-height` on the object, so tall diagrams swallow the
      viewport. (This is the bug we are fixing.)
    - inline <svg>...</svg> in markdown: mdBook / pulldown-cmark lowercases HTML
      element names; inside <svg>, names are case-sensitive, so any
      <foreignObject> would break. (Moot here, but still fragile.)
    - <img src="file.svg">: a true replaced element. The browser derives the
      aspect ratio from the SVG's viewBox, so CSS `max-width:100%` +
      `max-height:NNvh` + `height:auto` scale the diagram to fit BOTH bounds
      while preserving aspect ratio. Sizing is reliable and theme-agnostic.
      Safe here precisely because there is no foreignObject HTML to lose.

Replaces mdbook-mermaid entirely: no client-side JS.

mdBook invokes this script in two modes:
  1. `mermaid-to-svg.py supports <renderer>` — exit 0 for supported renderers.
  2. `mermaid-to-svg.py` (no args) — read [context, book] JSON on stdin,
     emit modified book JSON on stdout.

Register in book.toml:
    [preprocessor.mermaid-svg]
    command = "python scripts/mermaid-to-svg.py"
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path, PurePosixPath

MERMAID_FENCE_RE = re.compile(
    r"^```mermaid[ \t]*\r?\n(.*?)^```[ \t]*$",
    re.MULTILINE | re.DOTALL,
)

ACC_TITLE_RE = re.compile(r"^\s*accTitle:\s*(.+?)\s*$", re.MULTILINE)
ACC_DESCR_RE = re.compile(r"^\s*accDescr:\s*(.+?)\s*$", re.MULTILINE)
CHAPTER_NUM_RE = re.compile(r"^ch0*(\d+)")


def extract_directive(body: str, regex: re.Pattern) -> str | None:
    m = regex.search(body)
    return m.group(1).strip() if m else None


def chapter_number(stem: str) -> str | None:
    m = CHAPTER_NUM_RE.match(stem)
    return m.group(1) if m else None


def escape_html(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


REPO_ROOT = Path(__file__).resolve().parent.parent
SVG_DIR = REPO_ROOT / "src" / "images" / "diagrams"


def image_path_from_chapter(chapter_path: str, figure_index: int, stem: str) -> str:
    """Markdown image src (relative to the chapter file). e.g.
    src/part0/ch01-foo.md → "../images/diagrams/ch01-foo-fig01.svg"."""
    parts = PurePosixPath(chapter_path.replace("\\", "/")).parts
    depth = max(0, len(parts) - 1)
    prefix = "../" * depth
    return f"{prefix}images/diagrams/{stem}-fig{figure_index:02d}.svg"


def transform_content(content: str, chapter_path: str) -> str:
    """Replace every ```mermaid block in `content` with an SVG image embed.

    Pulls `accTitle:` and `accDescr:` directives from the mermaid source to
    drive figure captions and alt text:
        accTitle → figcaption (visible "Figure N.M: <title>")
        accDescr → img alt text (screen-reader description)
    Falls back to generic placeholders if directives are absent.
    """
    # Normalize CRLF -> LF. Some chapters use CRLF endings, and the closing-fence
    # regex `^```[ \t]*$` can't match when a `\r` sits between the backticks and
    # the `$` line-boundary. Normalizing here is simpler than a CRLF-aware regex.
    content = content.replace("\r\n", "\n")

    stem = PurePosixPath(chapter_path.replace("\\", "/")).stem
    chap_num = chapter_number(stem)
    counter = {"n": 0}

    def replace(match: re.Match) -> str:
        counter["n"] += 1
        i = counter["n"]
        body = match.group(1)
        title = extract_directive(body, ACC_TITLE_RE)
        descr = extract_directive(body, ACC_DESCR_RE)

        fig_label = f"Figure {chap_num}.{i}" if chap_num else f"Figure {i}"
        alt_text = descr or f"{fig_label} from {stem}"
        caption = title or fig_label
        data_src = image_path_from_chapter(chapter_path, i, stem)

        # <img src="..."> is a true replaced element: the browser derives the
        # aspect ratio from the SVG's viewBox, so the CSS in diagrams.css
        # (max-width:100% + max-height:NNvh + height:auto) scales each diagram
        # to fit the viewport while preserving aspect ratio. alt carries the
        # accDescr for screen readers.
        return (
            f'<figure class="mermaid-figure">'
            f'<img src="{data_src}" '
            f'alt="{escape_html(alt_text)}" loading="lazy" decoding="async">'
            f'<figcaption>{escape_html(fig_label)}: '
            f'{escape_html(caption)}</figcaption>'
            f'</figure>'
        )

    return MERMAID_FENCE_RE.sub(replace, content)


def walk_sections(sections: list) -> None:
    """Mutate each Chapter's content in-place."""
    for item in sections:
        if not isinstance(item, dict):
            continue
        chapter = item.get("Chapter")
        if chapter is None:
            continue
        path = chapter.get("path")
        content = chapter.get("content")
        if path and content:
            chapter["content"] = transform_content(content, path)
        sub = chapter.get("sub_items")
        if sub:
            walk_sections(sub)


def main() -> int:
    if len(sys.argv) >= 2 and sys.argv[1] == "supports":
        # Support every renderer; static SVGs work for all of them.
        return 0

    # Force UTF-8 on stdio. On Windows, default encoding is cp1252 which
    # mangles non-ASCII; mdBook also expects UTF-8 JSON on stdin/stdout.
    raw = sys.stdin.buffer.read().decode("utf-8")
    if not raw.strip():
        return 0
    context, book = json.loads(raw)
    # mdBook serializes the book's items list as "items" (not "sections" despite
    # the field name in the Rust struct). The list is a tree of BookItem enums.
    walk_sections(book.get("items", []))
    # ensure_ascii=False keeps Unicode as real UTF-8 bytes (no \uXXXX surrogates,
    # which mdBook's strict JSON parser rejects when they come in pairs).
    out = json.dumps(book, ensure_ascii=False)
    sys.stdout.buffer.write(out.encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
