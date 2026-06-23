/* Rustc citation -> compact clickable label.

   The book's editorial discipline writes citations in their full forensic
   form inside inline-code spans:

       compiler/rustc_middle/src/ty/instance.rs::Instance::resolve_drop_in_place@59807616e1fa

   That full string is great for the source markdown (any contributor can
   diff a claim against the actual rustc commit it cites) but visually
   crowds the rendered prose. This script replaces each citation's visible
   text with a short label, while keeping the URL pointing at the file at
   the pinned commit and the full citation in the link's title (tooltip).

   Visible label rules:
     - If the citation has a symbol (after `::`), label = last `::` segment.
       e.g. `path/foo.rs::Bar::baz@sha`  ->  label "baz"
     - Otherwise, label = file basename. e.g. `path/foo.rs@sha` -> "foo.rs"

   The original <code> styling is preserved, so the label still reads as
   an identifier in the prose.
*/

(function () {
    "use strict";

    // 1: path (.../*.rs)
    // 2: symbol-ish (optional, after ::)
    // 3: SHA (7 to 40 hex chars)
    const CITATION_RE = /([\w./-]+\.rs)(?:::([^\s@`]+))?@([0-9a-f]{7,40})/;

    function linkify(codeEl) {
        if (codeEl.closest("a")) return;
        const text = codeEl.textContent || "";
        const match = CITATION_RE.exec(text);
        if (!match) return;

        const path = match[1];
        const symbol = match[2] || null;
        const sha = match[3];

        const url = `https://github.com/rust-lang/rust/blob/${sha}/${path}`;
        const fullCitation = symbol
            ? `${path}::${symbol}@${sha}`
            : `${path}@${sha}`;

        // Compact label
        const label = symbol
            ? symbol.split("::").pop()
            : path.split("/").pop();

        codeEl.textContent = label;

        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "rustc-citation-link";
        a.title = `${fullCitation}  (opens on rust-lang/rust at the pinned commit)`;
        codeEl.parentNode.insertBefore(a, codeEl);
        a.appendChild(codeEl);
    }

    function setup() {
        document.querySelectorAll("code").forEach((c) => {
            const t = c.textContent;
            if (!t || !t.includes(".rs") || !t.includes("@")) return;
            linkify(c);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
