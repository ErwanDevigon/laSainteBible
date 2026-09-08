/** Edition registry, cookie order, chrome. */

import {
  BOOK_BY_ID,
  GOSPEL_IDS,
  VERSIONS,
  bookHref,
  bookName,
  versionIdsByYear,
} from "./books.js";

export const EDITION_SEGOND = "segond-1910";
export const EDITION_OSTERVALD = "ostervald";
export const EDITION_SEPTANTE = "septante";
export const EDITION_VULGATE = "vulgate";
export const DEFAULT_ACTIVE = EDITION_OSTERVALD;

const CANON_PHRASE = {
  "fr:protestant": "canon protestant",
  "fr:catholic": "canon catholique",
  "fr:orthodox": "canon orthodoxe",
  "la:protestant": "canon protestanticum",
  "la:catholic": "canon catholicum",
  "la:orthodox": "canon orthodoxum",
  "el:protestant": "κανὼν προτεσταντικός",
  "el:catholic": "κανὼν καθολικός",
  "el:orthodox": "κανὼν ὀρθόδοξος",
};

const CANON_HEAD = {
  "fr:protestant": "Canon protestant",
  "fr:catholic": "Canon catholique",
  "fr:orthodox": "Canon orthodoxe",
  "la:protestant": "Canon protestanticum",
  "la:catholic": "Canon catholicum",
  "la:orthodox": "Canon orthodoxum",
  "el:protestant": "Κανὼν προτεσταντικός",
  "el:catholic": "Κανὼν καθολικός",
  "el:orthodox": "Κανὼν ὀρθόδοξος",
};

export const EDITIONS = VERSIONS;

export const EDITION_STACK = versionIdsByYear(false);

const COOKIE_ACTIVE = "lsb-active-edition";
const COOKIE_COLS = "lsb-reader-cols";
const COOKIE_LEGACY = "lsb-edition-order";
const COOKIE_AGE = 60 * 60 * 24 * 365;

function readCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_AGE}; SameSite=Lax`;
}

function parseIds(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((id) => EDITIONS[id]);
}

export function displayBookTitle(title) {
  return String(title || "").replace(/\bsaint\b/gi, "Saint");
}

export function editionCol(id) {
  return EDITIONS[id]?.id || id;
}

export function editionLabel(id) {
  return EDITIONS[id]?.label || id;
}

export function editionName(id) {
  const v = EDITIONS[id];
  if (!v) return id;
  return v.name || v.label || id;
}

export function editionYearShort(id) {
  const v = EDITIONS[id];
  if (!v) return "";
  if (v.year_label) return v.year_label;
  if (v.year != null && v.year !== "") return String(v.year);
  return "";
}

export function editionBlurb(id) {
  const v = EDITIONS[id];
  return v?.blurb || v?.label || id;
}

export function editionCanonKey(id) {
  const v = EDITIONS[id];
  if (!v) return "";
  return `${v.lang || "fr"}:${v.canon || ""}`;
}

export function editionCanonPhrase(id) {
  const key = editionCanonKey(id);
  return CANON_PHRASE[key] || CANON_PHRASE[`fr:${EDITIONS[id]?.canon}`] || "";
}

export function editionCanonHead(id) {
  const key = editionCanonKey(id);
  return CANON_HEAD[key] || CANON_HEAD[`fr:${EDITIONS[id]?.canon}`] || "";
}

/** Blurb in the version language, with date. */
export function editionBlurbDated(id) {
  const blurb = editionBlurb(id);
  const year = editionYearShort(id);
  if (!year) return blurb;
  if (blurb.includes(year) || /·\s*-?\d/.test(blurb)) return blurb;
  return `${blurb} · ${year}`;
}

/** Left sub-bar: blurb · date · canon. */
export function editionBlurbDatedCanon(id) {
  const base = editionBlurbDated(id);
  const canon = editionCanonPhrase(id);
  return canon ? `${base} · ${canon}` : base;
}

/** Name · date (reader columns). */
export function editionDisplayName(id) {
  const name = editionName(id);
  const year = editionYearShort(id);
  return year ? `${name} · ${year}` : name;
}

/** Dropdown only: name in the edition language + date. Sub-bars untouched. */
export function editionMenuLabel(id) {
  const v = EDITIONS[id];
  const year = editionYearShort(id);
  let name = editionName(id);
  if (v?.lang === "el" && v.blurb) {
    name = String(v.blurb).split("·")[0].trim() || name;
  }
  return year ? `${name} · ${year}` : name;
}

export function readEditionOrder() {
  const cols = parseIds(readCookie(COOKIE_COLS));
  if (cols.length) return cols;
  const legacy = parseIds(readCookie(COOKIE_LEGACY));
  return legacy.length ? legacy : null;
}

export function writeEditionOrder(ids) {
  writeCookie(COOKIE_COLS, ids.join(","));
}

export function orderedEditions(available) {
  const have = [...available].filter((id) => EDITIONS[id]);
  const set = new Set(have);
  const saved = parseIds(readCookie(COOKIE_COLS));
  if (saved.length) {
    const out = saved.filter((id) => set.has(id));
    if (out.length) return out;
  }
  const active = getActiveEdition(have);
  if (set.has(active)) return [active];
  if (set.has(DEFAULT_ACTIVE)) return [DEFAULT_ACTIVE];
  return have.slice(0, 1);
}

export function swapEditionOrder(a, b, available) {
  const order = orderedEditions(available);
  const i = order.indexOf(a);
  const j = order.indexOf(b);
  if (i < 0 || j < 0 || i === j) return order;
  [order[i], order[j]] = [order[j], order[i]];
  writeEditionOrder(order);
  document.dispatchEvent(
    new CustomEvent("lsb:editions", { detail: { order, swapped: [a, b] } })
  );
  return order;
}

export function getActiveEdition(available = EDITION_STACK) {
  const have = new Set([...available].filter((id) => EDITIONS[id]));
  const saved = readCookie(COOKIE_ACTIVE);
  if (saved && EDITIONS[saved] && (!have.size || have.has(saved))) return saved;
  const legacy = parseIds(readCookie(COOKIE_LEGACY));
  const last = legacy[legacy.length - 1];
  if (last && (!have.size || have.has(last))) return last;
  if (have.has(DEFAULT_ACTIVE) || !have.size) return DEFAULT_ACTIVE;
  return [...have][0] || DEFAULT_ACTIVE;
}

export function setActiveEdition(id, available = EDITION_STACK) {
  if (!EDITIONS[id]) return orderedEditions(available);
  writeCookie(COOKIE_ACTIVE, id);
  const order = orderedEditions(available);
  if (order.length) order[order.length - 1] = id;
  else order.push(id);
  writeEditionOrder(order);
  document.dispatchEvent(
    new CustomEvent("lsb:editions", { detail: { order, active: id } })
  );
  return order;
}

export function setColumnEdition(index, id, available = EDITION_STACK) {
  if (!EDITIONS[id]) return orderedEditions(available);
  const order = orderedEditions(available);
  if (index < 0 || index >= order.length) return order;
  order[index] = id;
  if (index === order.length - 1) writeCookie(COOKIE_ACTIVE, id);
  writeEditionOrder(order);
  document.dispatchEvent(
    new CustomEvent("lsb:editions", { detail: { order, column: index, id } })
  );
  return order;
}

export function prependReaderColumn(id, available = EDITION_STACK) {
  if (!EDITIONS[id]) return orderedEditions(available);
  const order = orderedEditions(available);
  if (order.includes(id)) return order;
  order.unshift(id);
  writeEditionOrder(order);
  document.dispatchEvent(
    new CustomEvent("lsb:editions", { detail: { order, prepended: id } })
  );
  return order;
}

export function nextUnusedColumn(columns, available) {
  const used = new Set(columns);
  for (const id of EDITION_STACK) {
    if (available.includes(id) && !used.has(id)) return id;
  }
  return null;
}

export function editionsByYearDesc(ids) {
  return [...ids].sort((a, b) => {
    const dy = (EDITIONS[b]?.year ?? 0) - (EDITIONS[a]?.year ?? 0);
    return dy || a.localeCompare(b);
  });
}

export function mountHeaderTranslation() {
  const header = document.querySelector(".site-header");
  if (!header) return null;
  header.querySelector(".header-translation")?.remove();
  const block = header.querySelector(".brand-block");
  if (block) {
    const brand = block.querySelector(".brand");
    if (brand) block.replaceWith(brand);
    else block.remove();
  }
  header.classList.remove("has-translation");
  return null;
}

export function mountActiveEditionBar(available = EDITION_STACK) {
  document.querySelector(".active-edition-bar")?.remove();
  closeEditionMenu();
  document.body.classList.add("has-active-edition");
  document.body.classList.remove("has-editions");

  const pool = available.length ? available : EDITION_STACK;
  const active = getActiveEdition(pool);
  mountHeaderTranslation();

  const bar = document.createElement("div");
  bar.className = "active-edition-bar";

  const blurb = document.createElement("p");
  blurb.className = "edition-bar-blurb";
  blurb.textContent = editionBlurbDatedCanon(active);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "edition-name-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.textContent = editionName(active);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (document.querySelector(".edition-menu")) {
      closeEditionMenu();
      return;
    }
    openEditionMenu(btn, active, pool, (otherId) => {
      setActiveEdition(otherId, pool);
    });
  });
  const spacer = document.createElement("span");
  spacer.className = "edition-bar-spacer";
  spacer.setAttribute("aria-hidden", "true");
  bar.append(blurb, btn, spacer);

  const header = document.querySelector(".site-header");
  if (header) header.after(bar);
  else document.body.prepend(bar);
  return bar;
}

function closeEditionMenu() {
  document.querySelector(".edition-menu")?.remove();
}

function openEditionMenu(anchor, currentId, stack, onPick) {
  closeEditionMenu();
  const others = editionsByYearDesc(stack.filter((id) => id !== currentId));
  if (!others.length) return;

  const menu = document.createElement("ul");
  menu.className = "edition-menu";
  menu.setAttribute("role", "listbox");

  for (const id of others) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = editionMenuLabel(id);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeEditionMenu();
      onPick(id);
    });
    li.append(btn);
    menu.append(li);
  }

  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.getBoundingClientRect().width;
  let left = r.left + r.width / 2 - mw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
  menu.style.left = `${left}px`;
  menu.style.top = `${r.bottom + 4}px`;

  const onDoc = (e) => {
    if (menu.contains(e.target) || anchor.contains(e.target)) return;
    closeEditionMenu();
    document.removeEventListener("pointerdown", onDoc, true);
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key !== "Escape") return;
    closeEditionMenu();
    document.removeEventListener("pointerdown", onDoc, true);
    document.removeEventListener("keydown", onKey);
  };
  document.addEventListener("pointerdown", onDoc, true);
  document.addEventListener("keydown", onKey);
}

function apostleBase() {
  return /\/lire(\/|$)/.test(window.location.pathname) ? "" : "lire/";
}

export function mountVolumeBar(bookId, peers) {
  const titleBar = document.createElement("nav");
  titleBar.className = "book-title-bar volume-bar";
  titleBar.setAttribute("aria-label", "Livres du volume");
  const base = apostleBase();
  const items = peers && peers.length ? peers : [{ id: bookId, title: BOOK_BY_ID[bookId]?.title || bookId }];
  for (const book of items) {
    const a = document.createElement("a");
    a.className = "volume-link";
    a.href = bookHref(book.id, base);
    a.textContent = displayBookTitle(bookName(book) || book.title || book.id);
    a.dataset.book = book.id;
    if (book.id === bookId) {
      a.setAttribute("aria-current", "page");
      a.classList.add("is-current");
    }
    titleBar.append(a);
  }
  return titleBar;
}

function mountApostleBar(bookId) {
  return mountVolumeBar(
    bookId,
    GOSPEL_IDS.map((id) => BOOK_BY_ID[id]).filter(Boolean)
  );
}

/**
 * Sticky chrome under the site header: book title + edition names.
 */
export function mountReaderChrome({ title, bookId, labels, available, peers } = {}) {
  document.body.classList.add("has-editions");
  document.body.style.setProperty("--edition-count", String(labels.length || 3));
  document.querySelector(".reader-chrome")?.remove();
  document.querySelector(".book-title-bar")?.remove();
  document.querySelector(".edition-name-bar")?.remove();
  closeEditionMenu();

  const stack = labels.map((item) => item.id).filter(Boolean);
  const pool = available && available.length ? available : stack;
  mountHeaderTranslation();

  let titleBar = null;
  if (peers && peers.length) {
    titleBar = mountVolumeBar(bookId, peers);
  } else if (bookId) {
    titleBar = mountVolumeBar(bookId, null);
  } else if (title) {
    titleBar = document.createElement("div");
    titleBar.className = "book-title-bar";
    titleBar.textContent = displayBookTitle(title);
  }

  const nameBar = document.createElement("div");
  nameBar.className = "edition-name-bar";
  const stage = document.createElement("div");
  stage.className = "edition-name-stage";
  stage.style.setProperty("--edition-count", String(labels.length || 3));

  labels.forEach((item, colIndex) => {
    const wrap = document.createElement("p");
    wrap.dataset.col = item.col || editionCol(item.id);
    wrap.dataset.edition = item.id;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "edition-name-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.textContent = item.label || editionDisplayName(item.id);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (document.querySelector(".edition-menu")) {
        closeEditionMenu();
        return;
      }
      openEditionMenu(btn, item.id, pool, (otherId) => {
        setColumnEdition(colIndex, otherId, pool);
      });
    });
    wrap.append(btn);
    stage.append(wrap);
  });
  nameBar.append(stage);

  const chrome = document.createElement("div");
  chrome.className = "reader-chrome";
  if (titleBar) chrome.append(titleBar);
  chrome.append(nameBar);

  const header = document.querySelector(".site-header");
  if (header) header.after(chrome);
  else document.body.prepend(chrome);

  if (titleBar) {
    document.body.style.setProperty("--book-bar-h", `${titleBar.offsetHeight}px`);
  }

  return { titleBar, nameBar, chrome };
}

/** Homepage / index: single centered name, like messe. */
export function mountSiteEditionBar(available = EDITION_STACK) {
  return mountActiveEditionBar(available);
}

export function wrapCurrentPane(editionId = DEFAULT_ACTIVE) {
  const existing = document.querySelector(".edition-pane.is-current");
  if (existing) return existing;

  const main = document.querySelector(".site-main");
  if (!main) return null;

  const pane = document.createElement("div");
  pane.className = "edition-pane is-current";
  pane.dataset.edition = editionId;
  main.parentNode.insertBefore(pane, main);
  pane.appendChild(main);
  document.body.dataset.edition = editionId;
  return pane;
}
