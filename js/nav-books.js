/** Book pickers — gospels (compact) or full canon catalog. */

import { BOOKS, SECTIONS, GOSPEL_IDS, BOOK_BY_ID, bookHref } from "./books.js";

export const GOSPEL_META = GOSPEL_IDS.map((id) => {
  const b = BOOK_BY_ID[id];
  return { id: b.id, label: b.name, short: b.short };
});

/**
 * @param {HTMLElement} container
 * @param {{ basePath?: string, mode?: 'cards'|'compact'|'canon' }} [opts]
 */
export function mountGospelPickers(container, opts = {}) {
  if (!container) return;
  const base = opts.basePath ?? "";
  const mode = opts.mode ?? "cards";

  if (mode === "canon") {
    mountCanonCatalog(container, base);
    return;
  }

  container.replaceChildren();
  container.classList.add(mode === "compact" ? "gospel-picks" : "choose-grid");

  for (const book of GOSPEL_META) {
    const a = document.createElement("a");
    a.href = bookHref(book.id, base);
    if (mode === "compact") {
      a.className = "gospel-pick-name";
      a.textContent = book.label;
    } else {
      a.className = "choose-card";
      const title = document.createElement("h2");
      title.textContent = book.label;
      a.appendChild(title);
    }
    container.appendChild(a);
  }
}

export function mountCanonCatalog(container, base = "") {
  container.replaceChildren();
  container.className = "canon-catalog";

  const groups = [
    { testament: "at", label: "Ancien Testament" },
    { testament: "nt", label: "Nouveau Testament" },
  ];

  for (const group of groups) {
    const block = document.createElement("section");
    block.className = "canon-testament";
    const h = document.createElement("h2");
    h.className = "canon-testament-title";
    h.textContent = group.label;
    block.append(h);

    for (const sec of SECTIONS.filter((s) => s.testament === group.testament)) {
      const books = BOOKS.filter((b) => b.section === sec.id);
      if (!books.length) continue;
      const secEl = document.createElement("section");
      secEl.className = "canon-section";
      const sh = document.createElement("h3");
      sh.className = "canon-section-title";
      sh.textContent = sec.label;
      const grid = document.createElement("div");
      grid.className = "canon-grid";
      for (const book of books) {
        const a = document.createElement("a");
        a.className = "canon-card";
        a.href = bookHref(book.id, base);
        a.textContent = book.name;
        grid.append(a);
      }
      secEl.append(sh, grid);
      block.append(secEl);
    }
    container.append(block);
  }
}
