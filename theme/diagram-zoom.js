/* Click-to-zoom on diagrams.
   Every figure.mermaid-figure becomes clickable; click opens a fullscreen
   overlay with the SVG enlarged. Click anywhere on the overlay or press
   Escape to close. */

(function () {
    "use strict";

    let overlayEl = null;

    function buildOverlay() {
        if (overlayEl) return overlayEl;
        overlayEl = document.createElement("div");
        overlayEl.id = "diagram-zoom-overlay";
        overlayEl.setAttribute("role", "dialog");
        overlayEl.setAttribute("aria-label", "Enlarged diagram. Click anywhere or press Escape to close.");
        overlayEl.addEventListener("click", closeOverlay);
        document.body.appendChild(overlayEl);
        return overlayEl;
    }

    function openOverlay(fig) {
        const img = fig.querySelector("img, object, svg");
        if (!img) return;
        const ov = buildOverlay();
        // Clone so the original layout stays intact.
        const clone = img.cloneNode(true);
        clone.removeAttribute("loading");
        clone.removeAttribute("decoding");
        clone.className = "diagram-zoom-image";
        // Caption (figcaption) shown under the image in the overlay.
        const captionEl = fig.querySelector("figcaption");
        ov.innerHTML = "";
        const inner = document.createElement("div");
        inner.className = "diagram-zoom-inner";
        inner.appendChild(clone);
        if (captionEl) {
            const cap = document.createElement("div");
            cap.className = "diagram-zoom-caption";
            cap.textContent = captionEl.textContent || "";
            inner.appendChild(cap);
        }
        ov.appendChild(inner);
        ov.classList.add("visible");
        document.body.classList.add("diagram-zoom-open");
    }

    function closeOverlay() {
        if (!overlayEl) return;
        overlayEl.classList.remove("visible");
        document.body.classList.remove("diagram-zoom-open");
    }

    function setup() {
        document.querySelectorAll("figure.mermaid-figure").forEach((fig) => {
            fig.classList.add("diagram-zoomable");
            fig.setAttribute("title", "Click to enlarge");
            fig.addEventListener("click", (e) => {
                // Allow normal link clicks inside the figure (rare); only
                // zoom on clicks on the image/figcaption itself.
                if (e.target.closest("a")) return;
                openOverlay(fig);
            });
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeOverlay();
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
