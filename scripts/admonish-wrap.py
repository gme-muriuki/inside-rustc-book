#!/usr/bin/env python3
"""Shim between mdbook >=0.5 and mdbook-admonish 1.20.

mdbook 0.5 renamed Book.sections -> Book.items and removed the
__non_exhaustive marker. admonish 1.20 still expects the old shape, so this
shim:

  - On the way in: items -> sections, add __non_exhaustive = null.
  - On the way out: sections -> items, drop __non_exhaustive.

The admonish stderr / stdout is piped through unchanged.
"""
import sys, subprocess, json

if len(sys.argv) > 1 and sys.argv[1] == "supports":
    sys.exit(subprocess.call(["mdbook-admonish"] + sys.argv[1:]))

raw = sys.stdin.buffer.read()
ctx, book = json.loads(raw)
if "items" in book and "sections" not in book:
    book["sections"] = book.pop("items")
book.setdefault("__non_exhaustive", None)
patched_in = json.dumps([ctx, book], ensure_ascii=False).encode("utf-8")

p = subprocess.run(
    ["mdbook-admonish"],
    input=patched_in,
    capture_output=True,
)
sys.stderr.buffer.write(p.stderr)
if p.returncode != 0:
    sys.stdout.buffer.write(p.stdout)
    sys.exit(p.returncode)

out_book = json.loads(p.stdout)
if "sections" in out_book and "items" not in out_book:
    out_book["items"] = out_book.pop("sections")
out_book.pop("__non_exhaustive", None)
sys.stdout.buffer.write(json.dumps(out_book, ensure_ascii=False).encode("utf-8"))
