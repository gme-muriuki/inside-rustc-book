/* Reading-time + word-count badge.
   At the top of each substantive chapter, stamps "~N min read · W words".
   Counts words in main content excluding code/pre, mermaid figures, quiz
   placeholders, and the page TOC. Skips pages with fewer than 200 words
   (cover, epigraph, glossary, etc) to avoid noise. */

(function () {
    "use strict";

    const WORDS_PER_MIN = 200; // technical-prose reading speed
    const MIN_WORDS_TO_SHOW = 200;

    function setup() {
        const main = document.querySelector("main");
        if (!main) return;

        // Clone so removals don't touch the real DOM.
        const clone = main.cloneNode(true);
        clone.querySelectorAll(
            "pre, code, .quiz-placeholder, figure.mermaid-figure, .sidetoc, .pagetoc, .reading-time"
        ).forEach((el) => el.remove());

        const text = (clone.textContent || "").trim();
        if (!text) return;
        const words = text.split(/\s+/).filter((w) => /\w/.test(w)).length;
        if (words < MIN_WORDS_TO_SHOW) return;

        const mins = Math.max(1, Math.round(words / WORDS_PER_MIN));
        const badge = document.createElement("div");
        badge.className = "reading-time";
        badge.innerHTML =
            `<span class="reading-time-icon" aria-hidden="true">⏱</span>` +
            ` ~${mins} min read · ${words.toLocaleString()} words`;

        // Insert at top of main. Skip past any sidetoc that pagetoc.js may
        // have already injected as the first child.
        let anchor = main.firstChild;
        while (anchor && anchor.classList && anchor.classList.contains("sidetoc")) {
            anchor = anchor.nextSibling;
        }
        main.insertBefore(badge, anchor);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
