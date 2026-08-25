/** Book pickers — gospels or edition TOC. */

import {
  BOOK_BY_ID,
  GOSPEL_IDS,
  TOC_SECTIONS,
  VERSIONS,
  bookHref,
  bookName,
} from "./books.js";

/** Louis Segond homepage TOC — freeze of commit 25be8d8. */
const SEGOND_TOC = [
  {
    testament: "at",
    label: "Ancien Testament",
    sections: [
      {
        label: "Pentateuque",
        ids: ["genese", "exode", "levitique", "nombres", "deuteronome"],
      },
      {
        label: "Livres historiques",
        ids: [
          "josue", "juges", "ruth", "1-samuel", "2-samuel", "1-rois", "2-rois",
          "1-chroniques", "2-chroniques", "esdras", "nehemie", "esther",
        ],
      },
      {
        label: "Livres poétiques",
        ids: ["job", "psaumes", "proverbes", "ecclesiaste", "cantique"],
      },
      {
        label: "Prophètes",
        ids: [
          "esaie", "jeremie", "lamentations", "ezechiel", "daniel",
          "osee", "joel", "amos", "abdias", "jonas", "michee",
          "nahum", "habacuc", "sophonie", "aggee", "zacharie", "malachie",
        ],
      },
    ],
  },
  {
    testament: "nt",
    label: "Nouveau Testament",
    sections: [
      { label: "Évangiles", ids: ["matthieu", "marc", "luc", "jean"] },
      { label: "Actes", ids: ["actes"] },
      {
        label: "Épîtres",
        ids: [
          "romains", "1-corinthiens", "2-corinthiens", "galates", "ephesiens",
          "philippiens", "colossiens", "1-thessaloniciens", "2-thessaloniciens",
          "1-timothee", "2-timothee", "tite", "philemon", "hebreux",
          "jacques", "1-pierre", "2-pierre", "1-jean", "2-jean", "3-jean", "jude",
        ],
      },
      { label: "Apocalypse", ids: ["apocalypse"] },
    ],
  },
];

const SEGOND_NAMES = {
  cantique: "Cantique",
  matthieu: "Matthieu",
  marc: "Marc",
  luc: "Luc",
  jean: "Jean",
};

function segondBookName(id) {
  if (SEGOND_NAMES[id]) return SEGOND_NAMES[id];
  return BOOK_BY_ID[id]?.title || id;
}
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

function fitCardMin(grid, titles) {
  const probe = document.createElement("span");
  probe.className = "canon-card-probe";
  grid.append(probe);
  let max = 0;
  for (const t of titles) {
    probe.textContent = t;
    max = Math.max(max, probe.offsetWidth);
  }
  probe.remove();
  const min = Math.max(7.5 * 16, Math.ceil(max) + 22);
  grid.style.setProperty("--card-min", `${min}px`);
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
    const titles = [];
    const grid = document.createElement("div");
    grid.className = "canon-grid";
    for (const book of group.books) {
      const a = document.createElement("a");
      a.className = "canon-card";
      a.href = bookHref(book.id, base);
      const label = bookName(book) || book.title || book.id;
      a.textContent = label;
      titles.push(label);
      grid.append(a);
    }
    section.append(grid);
    container.append(section);
    fitCardMin(grid, titles);
  }
}

/** Exact Segond catalog from 25be8d8: both testaments, section headers, short names. */
export function mountSegondCatalog(container, opts = {}) {
  const base = opts.base ?? "";
  container.replaceChildren();
  container.className = "canon-catalog is-classic";

  for (const group of SEGOND_TOC) {
    const block = document.createElement("section");
    block.className = "canon-testament";
    const h = document.createElement("h2");
    h.className = "canon-testament-title";
    h.textContent = group.label;
    block.append(h);

    for (const sec of group.sections) {
      const secEl = document.createElement("section");
      secEl.className = "canon-section";
      const sh = document.createElement("h3");
      sh.className = "canon-section-title";
      sh.textContent = sec.label;
      const grid = document.createElement("div");
      grid.className = "canon-grid";
      for (const id of sec.ids) {
        const a = document.createElement("a");
        a.className = "canon-card";
        a.href = bookHref(id, base);
        a.textContent = segondBookName(id);
        grid.append(a);
      }
      secEl.append(sh, grid);
      block.append(secEl);
    }
    container.append(block);
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
