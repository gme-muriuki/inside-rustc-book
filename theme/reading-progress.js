/* Reading-progress badge in the menu bar.

   Shows "N min left" based on the reader's scroll position through the
   current chapter. Uses the same word-counting logic reading-time.js
   uses for the top-of-chapter badge (excludes code/figures/quizzes/
   pagetoc). Updates on every scroll via requestAnimationFrame.

   Click the badge to scroll back to the top of the chapter.
*/

(function () {
    "use strict";

    const WPM = 200;
    const MIN_WORDS = 200;

    let totalMinutes = 0;
    let badge = null;

    function computeTotalMinutes() {
        const main = document.querySelector("main");
        if (!main) return 0;
        const clone = main.cloneNode(true);
        clone.querySelectorAll(
            "pre, code, .quiz-placeholder, figure.mermaid-figure, .sidetoc, .pagetoc, .reading-time, .footnote-definition"
        ).forEach((el) => el.remove());
        const text = (clone.textContent || "").trim();
        if (!text) return 0;
        const words = text.split(/\s+/).filter((w) => /\w/.test(w)).length;
        if (words < MIN_WORDS) return 0;
        return Math.max(1, Math.round(words / WPM));
    }

    function getScrollFraction() {
        const docH = document.documentElement.scrollHeight;
        const winH = window.innerHeight;
        const maxScroll = docH - winH;
        if (maxScroll <= 0) return 0;
        return Math.min(1, Math.max(0, window.scrollY / maxScroll));
    }

    function update() {
        if (!badge || totalMinutes === 0) return;
        const frac = getScrollFraction();
        const remaining = Math.max(0, Math.round(totalMinutes * (1 - frac)));
        if (remaining === 0) {
            badge.innerHTML =
                `<span class="reading-progress-icon" aria-hidden="true">✓</span>` +
                `<span class="reading-progress-text">done</span>`;
        } else {
            badge.innerHTML =
                `<span class="reading-progress-icon" aria-hidden="true">\u{1F4D6}</span>` +
                `<span class="reading-progress-text">${remaining} min left</span>`;
        }
    }

    function insertBadge() {
        const rightButtons = document.querySelector(".right-buttons");
        if (!rightButtons) return false;
        if (document.getElementById("reading-progress-badge")) return true;
        badge = document.createElement("button");
        badge.id = "reading-progress-badge";
        badge.type = "button";
        badge.className = "icon-button";
        badge.setAttribute("aria-label", "Reading progress");
        badge.title = "Estimated reading time remaining on this page; click to scroll to top.";
        badge.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        // Insert AFTER the quiz-progress badge (which is at firstChild) so
        // the visual ordering is: quizzes-done | reading-left | (mdBook chrome).
        const quizBadge = document.getElementById("quiz-progress-badge");
        if (quizBadge && quizBadge.nextSibling) {
            rightButtons.insertBefore(badge, quizBadge.nextSibling);
        } else {
            rightButtons.insertBefore(badge, rightButtons.firstChild);
        }
        return true;
    }

    function setup() {
        totalMinutes = computeTotalMinutes();
        if (totalMinutes === 0) return;
        if (!insertBadge()) {
            setTimeout(() => {
                if (insertBadge()) update();
            }, 300);
            return;
        }
        update();
        let ticking = false;
        window.addEventListener(
            "scroll",
            () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(() => {
                    update();
                    ticking = false;
                });
            },
            { passive: true }
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
