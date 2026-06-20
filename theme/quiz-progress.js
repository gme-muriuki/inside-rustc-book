/* Quiz progress badge.
   mdbook-quiz with cache-answers = true persists every quiz's state in
   localStorage under keys of the form `mdbook-quiz:"<quiz-name>"`. This
   script scans those keys on page load, counts how many distinct chapter
   quizzes have any saved state, and injects a small "Quizzes: X / 26"
   badge into the menu bar (top right, near the search and theme buttons).
   Click the badge to clear all quiz progress (after confirmation). */

(function () {
    "use strict";

    const TOTAL_QUIZZES = 26; // chapters ch01 - ch26
    const PREFIX = "mdbook-quiz:";

    function findStartedQuizzes() {
        const started = new Set();
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(PREFIX)) {
                    // Strip the wrapping quotes that mdbook-quiz adds.
                    const name = k.slice(PREFIX.length).replace(/^"|"$/g, "");
                    if (/^ch\d{2}$/.test(name)) started.add(name);
                }
            }
        } catch (_) {}
        return started;
    }

    function makeBadge() {
        const started = findStartedQuizzes();
        const n = started.size;
        const badge = document.createElement("button");
        badge.id = "quiz-progress-badge";
        badge.type = "button";
        badge.className = "icon-button";
        badge.setAttribute("aria-label",
            `${n} of ${TOTAL_QUIZZES} chapter quizzes started. Click to clear.`);
        badge.title = `Quiz progress: ${n} / ${TOTAL_QUIZZES} chapter quizzes started. Click to clear.`;
        badge.innerHTML = `<span class="quiz-progress-icon" aria-hidden="true">📝</span><span class="quiz-progress-count">${n}/${TOTAL_QUIZZES}</span>`;
        badge.addEventListener("click", () => {
            if (!started.size) return;
            if (!confirm(`Clear all ${started.size} saved quiz answers?`)) return;
            try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
                }
            } catch (_) {}
            window.location.reload();
        });
        return badge;
    }

    function insertBadge() {
        // mdBook menu bar has right-buttons div with the print button etc.
        const rightButtons = document.querySelector(".right-buttons");
        if (!rightButtons) return false;
        if (document.getElementById("quiz-progress-badge")) return true;
        rightButtons.insertBefore(makeBadge(), rightButtons.firstChild);
        return true;
    }

    function setup() {
        if (!insertBadge()) {
            // Menu bar not present yet; retry once.
            setTimeout(insertBadge, 300);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
