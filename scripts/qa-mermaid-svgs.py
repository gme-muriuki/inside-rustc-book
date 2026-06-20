#!/usr/bin/env python3
"""Structural QA pass over the pre-rendered SVGs.

Flags diagrams likely to have visual problems:
  - extreme widths (> 1400px) → mobile / print overflow
  - extreme aspect ratios (very tall / very wide) → awkward layouts
  - text labels longer than their containing node (heuristic)
  - missing or zero viewBox

Pure heuristics — final call still needs eyeballs.
"""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"svg": "http://www.w3.org/2000/svg"}

REPO_ROOT = Path(__file__).resolve().parent.parent
SVG_DIR = REPO_ROOT / "src" / "images" / "diagrams"

# Thresholds
WIDE_PX = 1400          # diagrams wider than this likely overflow on mobile / print
TALL_PX = 2000          # extremely tall diagrams
EXTREME_RATIO_W = 4.0   # width / height > this = very wide
EXTREME_RATIO_H = 3.0   # height / width > this = very tall


def parse_viewbox(svg_path: Path) -> tuple[float, float] | None:
    """Return (width, height) from viewBox or None if absent/invalid."""
    try:
        text = svg_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"READ-FAIL  {svg_path.name}: {e}", file=sys.stderr)
        return None
    m = re.search(r'viewBox="([\d.\s\-]+)"', text)
    if not m:
        return None
    parts = m.group(1).split()
    if len(parts) != 4:
        return None
    try:
        _x, _y, w, h = (float(p) for p in parts)
    except ValueError:
        return None
    return (w, h)


def count_label_overruns(svg_path: Path) -> int:
    """Count <foreignObject> labels whose text appears to overflow.

    Heuristic: foreignObject has width="W" but the inner <p> text length suggests
    it needs more space (rough: ~7px per monospace char @ 14px font).
    Returns count of suspicious labels.
    """
    try:
        text = svg_path.read_text(encoding="utf-8")
    except Exception:
        return 0
    # Find foreignObject elements with width and inner <p>...</p>
    overruns = 0
    for m in re.finditer(r'<foreignObject\s+width="([\d.]+)"[^>]*>.*?<p[^>]*>(.*?)</p>', text, re.DOTALL):
        width_px = float(m.group(1))
        # Strip HTML tags from the text content
        text_only = re.sub(r"<[^>]+>", "", m.group(2))
        text_only = text_only.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        if not text_only.strip():
            continue
        # Estimate widest line
        longest_line = max((len(line) for line in text_only.split("\n") if line.strip()), default=0)
        # ~8px per char at 14px monospace (rough)
        estimated_width = longest_line * 8
        if estimated_width > width_px + 20:  # 20px tolerance
            overruns += 1
    return overruns


def main() -> int:
    svgs = sorted(SVG_DIR.glob("*.svg"))
    if not svgs:
        print(f"No SVGs in {SVG_DIR}")
        return 1

    findings: dict[str, list[str]] = defaultdict(list)
    chapter_stats: dict[str, list[tuple[float, float]]] = defaultdict(list)

    for svg in svgs:
        vb = parse_viewbox(svg)
        if vb is None:
            findings["no_viewbox"].append(svg.name)
            continue
        w, h = vb
        chapter = svg.name.split("-fig")[0]
        chapter_stats[chapter].append((w, h))

        # Width / height extremes
        if w > WIDE_PX:
            findings["wide"].append(f"{svg.name} ({int(w)}x{int(h)})")
        if h > TALL_PX:
            findings["tall"].append(f"{svg.name} ({int(w)}x{int(h)})")

        # Aspect ratio extremes
        if h > 0 and w / h > EXTREME_RATIO_W:
            findings["very_wide_ratio"].append(f"{svg.name} ({w/h:.1f}:1, {int(w)}x{int(h)})")
        if w > 0 and h / w > EXTREME_RATIO_H:
            findings["very_tall_ratio"].append(f"{svg.name} (1:{h/w:.1f}, {int(w)}x{int(h)})")

        # Label overruns
        overruns = count_label_overruns(svg)
        if overruns > 0:
            findings["label_overrun"].append(f"{svg.name} ({overruns} label(s))")

    print(f"=== QA pass over {len(svgs)} SVGs ===\n")

    chapters = sorted(chapter_stats.keys())
    print(f"Chapters: {len(chapters)}")
    total_w = sum(w for stats in chapter_stats.values() for w, _ in stats)
    total_h = sum(h for stats in chapter_stats.values() for _, h in stats)
    n = sum(len(s) for s in chapter_stats.values())
    print(f"Mean dimensions: {total_w/n:.0f} x {total_h/n:.0f} px")
    max_w = max((w for s in chapter_stats.values() for w, _ in s), default=0)
    max_h = max((h for s in chapter_stats.values() for _, h in s), default=0)
    print(f"Max dimensions: {max_w:.0f} x {max_h:.0f} px\n")

    labels = {
        "no_viewbox": "SVGs missing viewBox (likely broken)",
        "wide": f"Wide (>{WIDE_PX}px) — mobile / print overflow risk",
        "tall": f"Very tall (>{TALL_PX}px)",
        "very_wide_ratio": f"Extreme aspect (W:H > {EXTREME_RATIO_W}:1)",
        "very_tall_ratio": f"Extreme aspect (H:W > {EXTREME_RATIO_H}:1)",
        "label_overrun": "Labels likely overflowing their containers (heuristic)",
    }

    any_found = False
    for key, label in labels.items():
        items = findings.get(key, [])
        if not items:
            continue
        any_found = True
        print(f"== {label} ({len(items)}) ==")
        for it in items[:20]:
            print(f"  - {it}")
        if len(items) > 20:
            print(f"  ... and {len(items) - 20} more")
        print()

    if not any_found:
        print("No structural anomalies flagged. Real visual review still needed for layout / readability.")
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
