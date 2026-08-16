/** Edition registry, cookie order, reader chrome. */

import { BOOK_BY_ID, GOSPEL_IDS, isGospel, bookHref } from "./books.js";

export const EDITION_SEGOND = "segond-1910";
export const EDITION_SEPTANTE = "septante";
export const EDITION_VULGATE = "vulgate";

export const LABEL_SEGOND = "Traduction de Louis Segond · 1910";
export const LABEL_SEPTANTE = "Septante";
export const LABEL_VULGATE = "Vulgate";

export const EDITIONS = {
  [EDITION_VULGATE]: { id: EDITION_VULGATE, label: LABEL_VULGATE, col: "vulgate" },
  [EDITION_SEPTANTE]: { id: EDITION_SEPTANTE, label: LABEL_SEPTANTE, col: "septante" },
  [EDITION_SEGOND]: { id: EDITION_SEGOND, label: LABEL_SEGOND, col: "segond" },
};

/** Left-to-right stack. Last item is the rest position. */
export const EDITION_STACK = [
  EDITION_VULGATE,
  EDITION_SEPTANTE,
  EDITION_SEGOND,
];

const COOKIE = "lsb-edition-order";
const COOKIE_AGE = 60 * 60 * 24 * 365;

export function displayBookTitle(title) {
  return String(title || "").replace(/\bsaint\b/gi, "Saint");
}

export function editionCol(id) {
  return EDITIONS[id]?.col || id;
}

export function editionLabel(id) {
  return EDITIONS[id]?.label || id;
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
  for (const id of EDITION_STACK) {
    if (set.has(id)) {
      out.push(id);
      set.delete(id);
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

function closeEditionMenu() {
  document.querySelector(".edition-menu")?.remove();
}

function openEditionMenu(anchor, currentId, stack, onPick) {
  closeEditionMenu();
  const others = stack.filter((id) => id !== currentId);
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
  const mw = Math.max(r.width, 12 * 16);
  menu.style.minWidth = `${mw}px`;
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

function mountApostleBar(bookId) {
  const titleBar = document.createElement("nav");
  titleBar.className = "book-title-bar apostle-bar";
  titleBar.setAttribute("aria-label", "Évangiles");
  const base = apostleBase();
  for (const id of GOSPEL_IDS) {
    const meta = BOOK_BY_ID[id];
    const a = document.createElement("a");
    a.className = "apostle-link";
    a.href = bookHref(id, base);
    a.textContent = meta?.name || id;
    a.dataset.book = id;
    if (id === bookId) {
      a.setAttribute("aria-current", "page");
      a.classList.add("is-current");
    }
    titleBar.append(a);
  }
  return titleBar;
}

function mountPlainTitleBar(title) {
  const titleBar = document.createElement("div");
  titleBar.className = "book-title-bar";
  titleBar.textContent = displayBookTitle(title);
  return titleBar;
}

/**
 * Sticky chrome under the site header: book title + edition names.
 * @param {{
 *   title?: string,
 *   bookId?: string,
 *   labels: { id: string, col?: string, label: string }[],
 *   available?: string[],
 * }} opts
 */
export function mountReaderChrome({ title, bookId, labels, available } = {}) {
  document.body.classList.add("has-editions");
  document.body.style.setProperty("--edition-count", String(labels.length || 3));
  document.querySelector(".book-title-bar")?.remove();
  document.querySelector(".edition-name-bar")?.remove();
  closeEditionMenu();

  const stack = labels.map((item) => item.id).filter(Boolean);
  const pool = available && available.length ? available : stack;

  let titleBar = null;
  if (bookId && isGospel(bookId)) {
    titleBar = mountApostleBar(bookId);
  } else if (title) {
    titleBar = mountPlainTitleBar(title);
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
      const open = document.querySelector(".edition-menu");
      if (open) {
        closeEditionMenu();
        return;
      }
      openEditionMenu(btn, item.id, stack, (otherId) => {
        swapEditionOrder(item.id, otherId, pool);
      });
    });
    wrap.append(btn);
    stage.append(wrap);
  }
  nameBar.append(stage);

  const header = document.querySelector(".site-header");
  if (header) {
    if (titleBar) {
      header.after(titleBar);
      titleBar.after(nameBar);
    } else {
      header.after(nameBar);
    }
  } else {
    if (titleBar) document.body.prepend(titleBar);
    (titleBar || document.body).after?.(nameBar);
    if (!titleBar) document.body.prepend(nameBar);
  }

  return { titleBar, nameBar };
}

/** Homepage / index: edition bar only, cookie-backed order. */
export function mountSiteEditionBar(available = EDITION_STACK) {
  const order = orderedEditions(available);
  return mountReaderChrome({
    labels: order.map((id) => ({
      id,
      col: editionCol(id),
      label: editionLabel(id),
    })),
    available,
  });
}

export function wrapCurrentPane(editionId = EDITION_SEGOND) {
  const existing = document.querySelector(".edition-pane.is-current");
  if (existing) return existing;

  const main = document.querySelector(".site-main");
  const footer = document.querySelector("body > .site-footer");
  if (!main) return null;

  const pane = document.createElement("div");
  pane.className = "edition-pane is-current";
  pane.dataset.edition = editionId;
  main.parentNode.insertBefore(pane, main);
  pane.appendChild(main);
  if (footer) pane.appendChild(footer);
  document.body.dataset.edition = editionId;
  return pane;
}
