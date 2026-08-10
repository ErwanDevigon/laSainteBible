/** Gospel pickers — name click reveals sober chapter list. */

export const GOSPEL_META = [
  { id: "matthieu", label: "Matthieu", short: "Mt", chapters: 28 },
  { id: "marc", label: "Marc", short: "Mc", chapters: 16 },
  { id: "luc", label: "Luc", short: "Lc", chapters: 24 },
  { id: "jean", label: "Jean", short: "Jn", chapters: 21 },
];

/**
 * @param {HTMLElement} container
 * @param {{ basePath?: string, mode?: 'cards'|'compact' }} [opts]
 */
export function mountGospelPickers(container, opts = {}) {
  if (!container) return;
  const base = opts.basePath ?? "";
  const mode = opts.mode ?? "cards";
  container.replaceChildren();
  container.classList.add(
    mode === "compact" ? "gospel-picks" : "choose-grid"
  );

  for (const book of GOSPEL_META) {
    const wrap = document.createElement("div");
    wrap.className =
      mode === "compact" ? "gospel-pick" : "choose-card gospel-pick";
    wrap.dataset.open = "false";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gospel-pick-name";
    btn.textContent = book.label;
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute(
      "aria-controls",
      `chapters-${book.id}-${mode}`
    );

    const panel = document.createElement("div");
    panel.className = "chapter-menu";
    panel.id = `chapters-${book.id}-${mode}`;
    panel.hidden = true;

    const list = document.createElement("div");
    list.className = "chapter-menu-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", `Chapitres — ${book.label}`);

    for (let n = 1; n <= book.chapters; n++) {
      const a = document.createElement("a");
      a.className = "chapter-menu-item";
      a.setAttribute("role", "option");
      a.href = `${base}${book.id}.html#c${n}`;
      a.textContent = `${book.short}${n}`;
      list.appendChild(a);
    }

    panel.appendChild(list);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = wrap.dataset.open !== "true";

      // close siblings
      container.querySelectorAll(".gospel-pick").forEach((el) => {
        if (el === wrap) return;
        el.dataset.open = "false";
        el.querySelector(".gospel-pick-name")?.setAttribute("aria-expanded", "false");
        const p = el.querySelector(".chapter-menu");
        if (p) p.hidden = true;
      });

      wrap.dataset.open = willOpen ? "true" : "false";
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      panel.hidden = !willOpen;
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    container.appendChild(wrap);
  }

  // click outside closes (once)
  if (!container.dataset.outsideBound) {
    container.dataset.outsideBound = "1";
    document.addEventListener("click", (e) => {
      if (e.target.closest(".gospel-pick")) return;
      container.querySelectorAll(".gospel-pick").forEach((el) => {
        el.dataset.open = "false";
        el.querySelector(".gospel-pick-name")?.setAttribute("aria-expanded", "false");
        const p = el.querySelector(".chapter-menu");
        if (p) p.hidden = true;
      });
    });
  }
}
