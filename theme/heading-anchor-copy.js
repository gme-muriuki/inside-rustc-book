/* Copy-link-to-heading button.

   Hovering any H2/H3/H4 inside main content reveals a small chain-link
   icon (inline SVG, currentColor) to the right of the heading. Click
   copies the heading's full URL (including #anchor) to the clipboard
   and briefly swaps the icon for a "Copied!" pill.
*/

(function () {
    "use strict";

    const LINK_SVG =
        '<svg viewBox="0 0 16 16" width="0.95em" height="0.95em" ' +
        'fill="currentColor" aria-hidden="true" focusable="false">' +
        '<path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 ' +
        '0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 ' +
        '1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l' +
        '-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 ' +
        '2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 ' +
        '2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-' +
        '1.06l-1.25 1.25a2 2 0 0 1-2.83 0Z"/></svg>';

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
            try {
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.style.position = "fixed";
                ta.style.top = "-9999px";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    function flash(button, text) {
        button.classList.add("copied");
        const label = button.querySelector(".heading-anchor-label");
        if (label) label.textContent = text;
        clearTimeout(button._flashTimer);
        button._flashTimer = setTimeout(() => {
            button.classList.remove("copied");
            if (label) label.textContent = "";
        }, 1300);
    }

    function makeButton(headingId) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "heading-anchor-copy";
        btn.setAttribute("aria-label", "Copy link to this section");
        btn.title = "Copy link to this section";
        btn.innerHTML =
            '<span class="heading-anchor-icon">' + LINK_SVG + '</span>' +
            '<span class="heading-anchor-label" aria-live="polite"></span>';
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url =
                window.location.origin +
                window.location.pathname +
                "#" + headingId;
            try {
                await copyToClipboard(url);
                flash(btn, "Copied!");
            } catch (_) {
                flash(btn, "Copy failed");
            }
        });
        return btn;
    }

    function setup() {
        document
            .querySelectorAll("main h2[id], main h3[id], main h4[id]")
            .forEach((h) => {
                if (h.querySelector(".heading-anchor-copy")) return;
                h.appendChild(makeButton(h.id));
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }
})();
