/** Book pickers — gospels or edition TOC. */

import {
  BOOK_BY_ID,
  GOSPEL_IDS,
  TOC_SECTIONS,
  VERSIONS,
  bookHref,
  bookName,
} from "./books.js";
import { loadVersionIndex } from "./data-loader.js";
import { getActiveEdition } from "./editions.js";

export const GOSPEL_META = GOSPEL_IDS.map((id) => {
  const b = BOOK_BY_ID[id];
  return { id: b.id, label: b.title, short: b.short };
});

export function mountGospelPickers(container, opts = {}) {
  if (!container) return;
  const base = opts.basePath ?? "";
  const mode = opts.mode ?? "cards";

  if (mode === "canon") {
    mountCanonCatalog(container, {
      base,
      versionId: opts.versionId || getActiveEdition(),
      testament: opts.testament || "at",
    });
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

/**
 * @param {HTMLElement} container
 * @param {{ base?: string, versionId?: string, testament?: 'at'|'nt', index?: object }} opts
 */
export async function mountCanonCatalog(container, opts = {}) {
  const base = opts.base ?? "";
  const versionId = opts.versionId || getActiveEdition();
  const testament = opts.testament || "at";
  const index = opts.index || (await loadVersionIndex(versionId));
  const books = (index?.books || []).filter((b) => b.testament === testament);
  const byId = Object.fromEntries(books.map((b) => [b.id, b]));

  container.replaceChildren();
  container.className = "canon-catalog";

  if (!books.length) {
    const empty = document.createElement("p");
    empty.className = "status-msg";
    empty.textContent = "Aucun livre dans ce testament pour cette version.";
    container.append(empty);
    return;
  }

  const sections = (typeof TOC_SECTIONS !== "undefined" ? TOC_SECTIONS : []).filter(
    (s) => s.testament === testament && s.ids.some((id) => byId[id])
  );
  const grouped = sections.length
    ? sections.map((s) => ({
        label: s.label,
        books: s.ids.map((id) => byId[id]).filter(Boolean),
      }))
    : [{ label: null, books }];

  const used = new Set(grouped.flatMap((g) => g.books.map((b) => b.id)));
  const leftover = books.filter((b) => !used.has(b.id));
  if (leftover.length) grouped.push({ label: null, books: leftover });

  for (const group of grouped) {
    const section = document.createElement("section");
    section.className = "canon-section";
    if (group.label) {
      const h = document.createElement("h2");
      h.className = "canon-section-title";
      h.textContent = group.label;
      section.append(h);
    }
    const grid = document.createElement("div");
    grid.className = "canon-grid";
    for (const book of group.books) {
      const a = document.createElement("a");
      a.className = "canon-card";
      a.href = bookHref(book.id, base);
      a.textContent = bookName(book) || book.title || book.id;
      grid.append(a);
    }
    section.append(grid);
    container.append(section);
  }
}

export function mountTestamentBar(versionId, current, onPick) {
  document.querySelector(".testament-bar")?.remove();
  const v = VERSIONS[versionId] || {
    at: "Ancien Testament",
    nt: "Nouveau Testament",
  };
  const bar = document.createElement("nav");
  bar.className = "testament-bar";
  bar.setAttribute("aria-label", "Testaments");
  for (const key of ["at", "nt"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "testament-link";
    btn.dataset.testament = key;
    btn.textContent = key === "at" ? v.at : v.nt;
    if (key === current) {
      btn.setAttribute("aria-current", "page");
      btn.classList.add("is-current");
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onPick(key);
    });
    bar.append(btn);
  }
  const after =
    document.querySelector(".active-edition-bar") ||
    document.querySelector(".edition-name-bar") ||
    document.querySelector(".site-header");
  if (after) after.after(bar);
  else document.body.prepend(bar);
  return bar;
}
