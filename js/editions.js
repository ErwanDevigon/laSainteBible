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
export const EDITION_SEPTANTE = "septante";
export const EDITION_VULGATE = "vulgate";
export const DEFAULT_ACTIVE = EDITION_SEGOND;

export const EDITIONS = VERSIONS;

export const EDITION_STACK = versionIdsByYear(false);

const COOKIE = "lsb-edition-order";
const COOKIE_AGE = 60 * 60 * 24 * 365;

export function displayBookTitle(title) {
  return String(title || "").replace(/\bsaint\b/gi, "Saint");
}

export function editionCol(id) {
  return EDITIONS[id]?.id || id;
}

export function editionLabel(id) {
  return EDITIONS[id]?.label || id;
}

export function editionBlurb(id) {
  const v = EDITIONS[id];
  return v?.blurb || v?.label || id;
}

export function readEditionOrder() {
  const m = document.cookie.match(/(?:^|;\s*)lsb-edition-order=([^;]*)/);
  if (!m) return null;
  const ids = decodeURIComponent(m[1])
    .split(",")
    .map((s) => s.trim())
    .filter((id) => EDITIONS[id]);
  return ids.length ? ids : null;
}

export function writeEditionOrder(ids) {
  document.cookie = `${COOKIE}=${encodeURIComponent(ids.join(","))}; path=/; max-age=${COOKIE_AGE}; SameSite=Lax`;
}

export function orderedEditions(available) {
  const have = [...available].filter((id) => EDITIONS[id]);
  const set = new Set(have);
  const out = [];
  for (const id of readEditionOrder() || []) {
    if (set.has(id)) {
      out.push(id);
      set.delete(id);
    }
  }
  if (!readEditionOrder() && set.has(DEFAULT_ACTIVE)) {
    for (const id of EDITION_STACK) {
      if (id === DEFAULT_ACTIVE) continue;
      if (set.has(id)) {
        out.push(id);
        set.delete(id);
      }
    }
    out.push(DEFAULT_ACTIVE);
    set.delete(DEFAULT_ACTIVE);
  } else {
    for (const id of EDITION_STACK) {
      if (set.has(id)) {
        out.push(id);
        set.delete(id);
      }
    }
  }
  for (const id of set) out.push(id);
  return out;
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
  const order = orderedEditions(available);
  return order[order.length - 1] || DEFAULT_ACTIVE;
}

export function setActiveEdition(id, available = EDITION_STACK) {
  if (!EDITIONS[id]) return orderedEditions(available);
  const order = orderedEditions(available).filter((x) => x !== id);
  order.push(id);
  writeEditionOrder(order);
  document.dispatchEvent(
    new CustomEvent("lsb:editions", { detail: { order, active: id } })
  );
  return order;
}

export function editionsByYearDesc(ids) {
  return [...ids].sort((a, b) => {
    const dy = (EDITIONS[b]?.year ?? 0) - (EDITIONS[a]?.year ?? 0);
    return dy || a.localeCompare(b);
  });
}

export function mountHeaderTranslation(versionId = getActiveEdition()) {
  const header = document.querySelector(".site-header");
  if (!header) return;
  let el = header.querySelector(".header-translation");
  if (!el) {
    el = document.createElement("p");
    el.className = "header-translation";
    const brand = header.querySelector(".brand");
    if (brand) {
      const wrap = document.createElement("div");
      wrap.className = "brand-block";
      brand.replaceWith(wrap);
      wrap.append(brand, el);
    } else {
      header.prepend(el);
    }
  }
  el.textContent = editionBlurb(versionId);
  header.classList.add("has-translation");
  return el;
}

export function mountActiveEditionBar(available = EDITION_STACK) {
  document.querySelector(".active-edition-bar")?.remove();
  closeEditionMenu();
  document.body.classList.add("has-active-edition");
  document.body.classList.remove("has-editions");

  const pool = available.length ? available : EDITION_STACK;
  const active = getActiveEdition(pool);
  mountHeaderTranslation(active);

  const bar = document.createElement("div");
  bar.className = "active-edition-bar";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "edition-name-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.textContent = editionLabel(active);
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
  bar.append(btn);

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
    btn.textContent = editionLabel(id);
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
  const active = getActiveEdition(pool);
  mountHeaderTranslation(active);

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

  for (const item of labels) {
    const wrap = document.createElement("p");
    wrap.dataset.col = item.col || editionCol(item.id);
    wrap.dataset.edition = item.id;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "edition-name-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.textContent = item.label;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (document.querySelector(".edition-menu")) {
        closeEditionMenu();
        return;
      }
      openEditionMenu(btn, item.id, pool, (otherId) => {
        setActiveEdition(otherId, pool);
      });
    });
    wrap.append(btn);
    stage.append(wrap);
  }
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

export function wrapCurrentPane(editionId = EDITION_SEGOND) {
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
