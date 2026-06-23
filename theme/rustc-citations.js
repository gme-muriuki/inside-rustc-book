/* Wrap rustc citation strings in links to GitHub source at the pinned SHA.

   A citation looks like:
       compiler/rustc_middle/src/ty/instance.rs::Symbol::path@<short-sha>
   Inside an inline-code span, this script wraps the whole <code> in an
   <a> pointing at github.com/rust-lang/rust/blob/<sha>/<path>.

   The SHA is taken from the citation itself, so each citation resolves
   to its own pinned commit. New target="_blank" so the reader keeps
   their reading place in the book tab. */

(function () {
    "use strict";

    // Match: <path>.rs ([::<symbol-ish>])? @<short-sha>
    // - path: word chars, slashes, dashes, dots; ends in .rs
    // - symbol: optional, after :: , no whitespace
    // - sha: 7-40 hex chars
    const CITATION_RE = /([\w./-]+\.rs)(?:::[^\s@`]+)?@([0-9a-f]{7,40})/;

    function linkify(codeEl) {
        // Skip if already inside a link.
        if (codeEl.closest("a")) return;
        const text = codeEl.textContent || "";
        const match = CITATION_RE.exec(text);
        if (!match) return;
        const [, path, sha] = match;
        const url = `https://github.com/rust-lang/rust/blob/${sha}/${path}`;
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "rustc-citation-link";
        a.title = `Open ${path} on rust-lang/rust at commit ${sha.slice(0, 7)}`;
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
