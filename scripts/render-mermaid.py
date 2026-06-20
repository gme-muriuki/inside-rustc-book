#!/usr/bin/env python3
"""Render Mermaid fenced blocks from markdown chapters to SVG files.

Finds ```mermaid ... ``` blocks in each input markdown file and renders
each one via mmdc (mermaid-cli) to:
    <out>/<chapter-stem>-fig<NN>.svg

The source markdown is NOT modified. SVGs are derived build artifacts,
intended for PDF/EPUB output (where browser-based mermaid does not run).
HTML output continues to use mdbook-mermaid as before.

Requires: mmdc on PATH (npm i -g @mermaid-js/mermaid-cli).

Usage:
    python scripts/render-mermaid.py src/part2/ch14-mir.md
    python scripts/render-mermaid.py src/**/ch*.md --force
    python scripts/render-mermaid.py --all
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

MMDC = shutil.which("mmdc") or shutil.which("mmdc.cmd")
if MMDC is None:
    print("ERROR: mmdc not on PATH. Install with: npm i -g @mermaid-js/mermaid-cli", file=sys.stderr)
    sys.exit(1)

MERMAID_FENCE_RE = re.compile(
    r"^```mermaid[ \t]*\r?\n(.*?)^```[ \t]*$",
    re.MULTILINE | re.DOTALL,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC_GLOB = "src/**/*.md"
DEFAULT_OUT = REPO_ROOT / "src" / "images" / "diagrams"


@dataclass
class Job:
    """One diagram to render."""
    src: str               # mermaid source code (post-substitution)
    out_svg: Path          # output path
    label: str             # human-readable name for logging
    config_file: str | None = None  # path passed to mmdc -c, if any


def apply_substitutions(src: str, subs: list[tuple[str, str]]) -> str:
    """Apply literal OLD->NEW string substitutions to mermaid source."""
    for old, new in subs:
        src = src.replace(old, new)
    return src


def collect_jobs(
    md_path: Path,
    out_dir: Path,
    force: bool,
    subs: list[tuple[str, str]],
    config_file: str | None,
) -> tuple[list[Job], int]:
    """Find all mermaid blocks in md_path. Returns (jobs, skipped_count)."""
    text = md_path.read_text(encoding="utf-8")
    matches = list(MERMAID_FENCE_RE.finditer(text))
    if not matches:
        return ([], 0)

    out_dir.mkdir(parents=True, exist_ok=True)
    basename = md_path.stem

    jobs: list[Job] = []
    skipped = 0
    for i, m in enumerate(matches, start=1):
        out_svg = out_dir / f"{basename}-fig{i:02d}.svg"
        if out_svg.exists() and not force:
            skipped += 1
            continue
        src = apply_substitutions(m.group(1).rstrip("\r\n"), subs)
        jobs.append(Job(
            src=src,
            out_svg=out_svg,
            label=out_svg.name,
            config_file=config_file,
        ))
    return (jobs, skipped)


def render_one(job: Job) -> tuple[Job, bool, str]:
    """Render a single diagram. Returns (job, ok, stderr_if_failed)."""
    with tempfile.NamedTemporaryFile(
        "w", suffix=".mmd", delete=False, encoding="utf-8"
    ) as tf:
        tf.write(job.src)
        tmp_path = Path(tf.name)
    try:
        cmd = [
            MMDC,
            "-i", str(tmp_path),
            "-o", str(job.out_svg),
            "-b", "transparent",
            "-q",
        ]
        if job.config_file:
            cmd.extend(["-c", job.config_file])
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0 or not job.out_svg.exists():
            return (job, False, result.stderr.strip())
        return (job, True, "")
    finally:
        tmp_path.unlink(missing_ok=True)


def expand_inputs(patterns: list[str], use_all: bool) -> list[Path]:
    """Resolve CLI args to a concrete sorted list of markdown files."""
    if use_all:
        return sorted(REPO_ROOT.glob(DEFAULT_SRC_GLOB))

    paths: list[Path] = []
    for pat in patterns:
        p = Path(pat)
        if not p.is_absolute():
            p = REPO_ROOT / p
        if any(c in pat for c in "*?["):
            paths.extend(sorted(REPO_ROOT.glob(pat)))
        elif p.exists():
            paths.append(p)
        else:
            print(f"WARN  {pat} not found", file=sys.stderr)
    seen = set()
    uniq = []
    for p in paths:
        rp = p.resolve()
        if rp not in seen:
            seen.add(rp)
            uniq.append(p)
    return uniq


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("chapters", nargs="*", help="Markdown paths or globs (relative to repo root)")
    ap.add_argument("--all", action="store_true", help=f"Render every {DEFAULT_SRC_GLOB}")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="Output directory for SVGs")
    ap.add_argument("--force", action="store_true", help="Overwrite existing SVGs")
    ap.add_argument("--jobs", "-j", type=int, default=max(2, (os.cpu_count() or 4) // 2),
                    help="Parallel mmdc workers (default: half of CPU count)")
    ap.add_argument("--config", help="mmdc config JSON file (passed as -c)")
    ap.add_argument("--substitute", action="append", default=[], metavar="OLD=NEW",
                    help="Literal string substitution in mermaid source before rendering (repeatable)")
    args = ap.parse_args()

    if not args.chapters and not args.all:
        ap.error("provide chapter paths/globs or --all")

    inputs = expand_inputs(args.chapters, args.all)
    if not inputs:
        print("nothing to render", file=sys.stderr)
        return 1

    out_dir = Path(args.out)
    if not out_dir.is_absolute():
        out_dir = REPO_ROOT / out_dir

    subs: list[tuple[str, str]] = []
    for spec in args.substitute:
        if "=" not in spec:
            ap.error(f"--substitute expects OLD=NEW, got: {spec!r}")
        k, v = spec.split("=", 1)
        subs.append((k, v))

    config_file = None
    if args.config:
        cf = Path(args.config)
        if not cf.is_absolute():
            cf = REPO_ROOT / cf
        if not cf.exists():
            ap.error(f"--config not found: {cf}")
        config_file = str(cf)

    all_jobs: list[Job] = []
    tot_s = 0
    for md in inputs:
        jobs, skipped = collect_jobs(md, out_dir, args.force, subs, config_file)
        all_jobs.extend(jobs)
        tot_s += skipped

    if not all_jobs:
        print(f"Nothing to render ({tot_s} already exist, use --force to overwrite)")
        return 0

    print(f"Rendering {len(all_jobs)} diagram(s) with {args.jobs} parallel workers ({tot_s} skipped)...\n")

    tot_r = tot_f = 0
    fails: list[tuple[Job, str]] = []
    with ThreadPoolExecutor(max_workers=args.jobs) as ex:
        futures = {ex.submit(render_one, j): j for j in all_jobs}
        for fut in as_completed(futures):
            job, ok, err = fut.result()
            if ok:
                tot_r += 1
                print(f"OK    {job.label}")
            else:
                tot_f += 1
                fails.append((job, err))
                print(f"FAIL  {job.label}", file=sys.stderr)

    if fails:
        print(f"\n{len(fails)} failure(s):", file=sys.stderr)
        for job, err in fails:
            print(f"  {job.label}: {err}", file=sys.stderr)

    print(f"\nDONE: {tot_r} rendered, {tot_s} skipped, {tot_f} failed across {len(inputs)} file(s)")
    return 0 if tot_f == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
