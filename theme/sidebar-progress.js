/* Sidebar chapter-completion markers.
   Reads the same localStorage keys that mdbook-quiz writes
   (`mdbook-quiz:"chNN"`) and adds a small green check next to the matching
   chapter in the left sidebar. The mark means "this chapter's quiz has
   saved state" -- not strictly "100% correct" -- but it's the cheapest
   visible-progress signal available without writing our own quiz layer. */

(function () {
    "use strict";

    const PREFIX = "mdbook-quiz:";

    function findStartedQuizzes() {
        const started = new Set();
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(PREFIX)) {
                    const name = k.slice(PREFIX.length).replace(/^"|"$/g, "");
                    if (/^ch\d{2}$/.test(name)) started.add(name);
                }
            }
        } catch (_) {}
        return started;
    }

    function markChapters(started) {
        if (!started.size) return;
        // Any sidebar link to a chapter URL contains "chNN" somewhere.
        document.querySelectorAll(".sidebar a, nav#sidebar a").forEach((a) => {
            const href = a.getAttribute("href") || "";
            const match = href.match(/ch(\d{2})/);
            if (!match) return;
            const chKey = "ch" + match[1];
            if (!started.has(chKey)) return;
            if (a.querySelector(".sidebar-progress-mark")) return;
            const mark = document.createElement("span");
            mark.className = "sidebar-progress-mark";
            mark.textContent = " ✓";
            mark.setAttribute("aria-label", "Quiz attempted");
            a.appendChild(mark);
        });
    }

    function setup() {
        markChapters(findStartedQuizzes());
        // Re-apply on localStorage changes from other tabs.
        window.addEventListener("storage", (e) => {
            if (e.key && e.key.startsWith(PREFIX)) {
                markChapters(findStartedQuizzes());
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
