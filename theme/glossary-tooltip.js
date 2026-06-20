/* Glossary hover tooltips.
   On the first hover of a link whose href ends in glossary.html#<anchor>,
   fetch the rendered glossary page once, parse its definitions into an
   anchor-keyed map, and show the matching definition in a tooltip.
   No popup on touch devices (hover events are unreliable there). */

(function () {
    "use strict";

    if (window.matchMedia("(hover: none)").matches) return;

    let glossaryMap = null;
    let glossaryPromise = null;
    let tooltipEl = null;
    let showTimer = null;
    let activeLink = null;
    const SHOW_DELAY_MS = 250;

    function isGlossaryLink(a) {
        const href = a.getAttribute("href") || "";
        return /glossary\.html#./.test(href);
    }

    function glossaryUrlFromLink(a) {
        const href = a.getAttribute("href") || "";
        const i = href.indexOf("#");
        return i === -1 ? href : href.slice(0, i);
    }

    async function loadGlossary(url) {
        if (glossaryMap) return glossaryMap;
        if (glossaryPromise) return glossaryPromise;
        glossaryPromise = (async () => {
            const map = new Map();
            try {
                const resp = await fetch(url);
                if (!resp.ok) return map;
                const html = await resp.text();
                const doc = new DOMParser().parseFromString(html, "text/html");
                // Term entries are h3[id="<anchor>"]. Capture every sibling up
                // to the next h2/h3 as the definition body.
                doc.querySelectorAll("h3[id]").forEach((h) => {
                    const parts = [];
                    let node = h.nextElementSibling;
                    while (node && !/^H[1-3]$/.test(node.tagName)) {
                        parts.push(node.outerHTML);
                        node = node.nextElementSibling;
                    }
                    map.set(h.id, parts.join(""));
                });
            } catch (_) {}
            glossaryMap = map;
            return map;
        })();
        return glossaryPromise;
    }

    function getTooltip() {
        if (tooltipEl) return tooltipEl;
        tooltipEl = document.createElement("div");
        tooltipEl.className = "glossary-tooltip";
        tooltipEl.setAttribute("role", "tooltip");
        document.body.appendChild(tooltipEl);
        return tooltipEl;
    }

    function positionTooltip(tt, link) {
        // Reset so we can measure its natural size.
        tt.style.maxHeight = "";
        tt.style.left = "0px";
        tt.style.top = "0px";
        const linkRect = link.getBoundingClientRect();
        const ttRect = tt.getBoundingClientRect();
        const pad = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Prefer below; flip above if it would overflow.
        let top = linkRect.bottom + window.scrollY + pad;
        const spaceBelow = vh - linkRect.bottom - pad;
        const spaceAbove = linkRect.top - pad;
        if (ttRect.height > spaceBelow && spaceAbove > spaceBelow) {
            top = linkRect.top + window.scrollY - ttRect.height - pad;
        }
        // Cap height to whichever side has more room.
        const maxH = Math.max(spaceBelow, spaceAbove) - pad;
        tt.style.maxHeight = maxH + "px";

        let left = linkRect.left + window.scrollX;
        if (left + ttRect.width > window.scrollX + vw - pad) {
            left = window.scrollX + vw - ttRect.width - pad;
        }
        if (left < window.scrollX + pad) left = window.scrollX + pad;
        tt.style.left = left + "px";
        tt.style.top = top + "px";
    }

    async function showFor(link) {
        const href = link.getAttribute("href") || "";
        const anchor = href.split("#")[1];
        if (!anchor) return;
        const map = await loadGlossary(glossaryUrlFromLink(link));
        const def = map.get(anchor);
        if (!def || activeLink !== link) return;
        const tt = getTooltip();
        tt.innerHTML = def;
        tt.classList.add("visible");
        positionTooltip(tt, link);
    }

    function hide() {
        if (tooltipEl) tooltipEl.classList.remove("visible");
        activeLink = null;
        clearTimeout(showTimer);
    }

    document.addEventListener("mouseover", (e) => {
        const a = e.target.closest("a");
        if (!a || !isGlossaryLink(a)) return;
        if (activeLink === a) return;
        activeLink = a;
        clearTimeout(showTimer);
        showTimer = setTimeout(() => showFor(a), SHOW_DELAY_MS);
    });
    document.addEventListener("mouseout", (e) => {
        const a = e.target.closest("a");
        if (!a || !isGlossaryLink(a)) return;
        // Only hide if we are leaving the link entirely.
        const next = e.relatedTarget;
        if (next && a.contains(next)) return;
        hide();
    });
    // Hide on scroll / resize / Esc to avoid orphan tooltips.
    document.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hide();
    });
})();
