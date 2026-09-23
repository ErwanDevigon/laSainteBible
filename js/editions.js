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
  "fr:jewish": "canon hébraïque",
  "la:protestant": "canon protestanticum",
  "la:catholic": "canon catholicum",
  "la:orthodox": "canon orthodoxum",
  "el:protestant": "κανὼν προτεσταντικός",
  "el:catholic": "κανὼν καθολικός",
  "el:orthodox": "κανὼν ὀρθόδοξος",
  "he:jewish": "תנ״ך",
  "he:protestant": "תנ״ך",
};

const CANON_HEAD = {
  "fr:protestant": "Canon protestant",
  "fr:catholic": "Canon catholique",
  "fr:orthodox": "Canon orthodoxe",
  "fr:jewish": "Canon hébraïque",
  "la:protestant": "Canon protestanticum",
  "la:catholic": "Canon catholicum",
  "la:orthodox": "Canon orthodoxum",
  "el:protestant": "Κανὼν προτεσταντικός",
  "el:catholic": "Κανὼν καθολικός",
  "el:orthodox": "Κανὼν ὀρθόδοξος",
  "he:jewish": "תנ״ך",
  "he:protestant": "תנ״ך",
};

export const EDITIONS = VERSIONS;

export const EDITION_STACK = versionIdsByYear(false);

const COOKIE_ACTIVE = "lsb-active-edition";
const COOKIE_COLS = "lsb-reader-cols";
const COOKIE_LEGACY = "lsb-edition-order";
const COOKIE_PARALLELS = "lsb-show-parallels";
const COOKIE_KIND = {
  synopse: "lsb-show-synopse",
  vetero: "lsb-show-vetero",
  accomplissement: "lsb-show-accomplissement",
};
const KIND_LABEL = {
  synopse: "suggestions synoptiques",
  vetero: "suggestions vétérotestamentaires",
  accomplissement: "accomplissement",
};
const COOKIE_AGE = 60 * 60 * 24 * 365;

function readCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_AGE}; SameSite=Lax`;
}

function parallelsMasterOn() {
  return readCookie(COOKIE_PARALLELS) !== "0";
}

/** Menu preset. Null cookie = selected. Independent of the master click. */
function parallelKindSelected(kind) {
  return readCookie(COOKIE_KIND[kind]) !== "0";
}

export function parallelKindEnabled(kind) {
  return parallelsMasterOn() && parallelKindSelected(kind);
}

function anyParallelKindOn() {
  return Object.keys(KIND_LABEL).some((k) => parallelKindEnabled(k));
}

function setParallelsMaster(on) {
  writeCookie(COOKIE_PARALLELS, on ? "1" : "0");
  document.dispatchEvent(
    new CustomEvent("lsb:parallels", { detail: { master: !!on } })
  );
  syncParallelsTrigger();
}

function syncParallelsTrigger() {
  document.querySelectorAll(".parallels-toggle-btn").forEach((btn) => {
    btn.classList.toggle("is-active", anyParallelKindOn());
  });
}

export function setParallelKindEnabled(kind, on) {
  writeCookie(COOKIE_KIND[kind], on ? "1" : "0");
  document.dispatchEvent(
    new CustomEvent("lsb:parallels", { detail: { kind, on: !!on } })
  );
  syncParallelsTrigger();
}

export function mountParallelsToggle() {
  const nav = document.createElement("nav");
  nav.className = "parallels-toggle";
  nav.setAttribute("aria-label", "Suggestions de lecture");
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "parallels-toggle-btn";
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", "Suggestions de lecture");
  trigger.textContent = "suggestions de lecture";
  let holdTimer = null;
  let held = false;
  const HOLD_MS = 420;
  const armHold = (e) => {
    if (e.button != null && e.button !== 0) return;
    held = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      holdTimer = null;
      held = true;
      if (!document.querySelector(".parallels-menu")) openParallelsMenu(trigger);
    }, HOLD_MS);
  };
  const cancelHold = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
  };
  trigger.addEventListener("pointerdown", armHold);
  trigger.addEventListener("pointerup", (e) => {
    const wasTimer = holdTimer != null;
    cancelHold();
    if (e.button !== 0 || held || !wasTimer) return;
    e.preventDefault();
    e.stopPropagation();
    if (document.querySelector(".parallels-menu")) {
      closeParallelsMenu();
      return;
    }
    setParallelsMaster(!parallelsMasterOn());
  });
  trigger.addEventListener("pointerleave", cancelHold);
  trigger.addEventListener("pointercancel", cancelHold);
  trigger.addEventListener("contextmenu", (e) => e.preventDefault());
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!document.querySelector(".parallels-menu")) openParallelsMenu(trigger);
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (document.querySelector(".parallels-menu")) closeParallelsMenu();
    else setParallelsMaster(!parallelsMasterOn());
  });
  nav.append(trigger);
  syncParallelsTrigger();
  return nav;
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

const LANG_TAG = { fr: "fr", la: "la", el: "el", he: "he" };

/** Dropdown only: name in the edition language + date. Sub-bars untouched. */
export function editionMenuLabel(id) {
  const v = EDITIONS[id];
  const year = editionYearShort(id);
  let name = editionName(id);
  if ((v?.lang === "el" || v?.lang === "he") && v.blurb) {
    name = String(v.blurb).split("·")[0].trim() || name;
  }
  const tag = LANG_TAG[v?.lang] || v?.lang || "";
  const core = year ? `${name} · ${year}` : name;
  return tag ? `${core} (${tag})` : core;
}

function fillEditionMenuLabel(btn, id) {
  const v = EDITIONS[id];
  const year = editionYearShort(id);
  let name = editionName(id);
  if ((v?.lang === "el" || v?.lang === "he") && v.blurb) {
    name = String(v.blurb).split("·")[0].trim() || name;
  }
  const tag = LANG_TAG[v?.lang] || v?.lang || "";
  const core = year ? `${name} · ${year}` : name;
  btn.replaceChildren();
  if (v?.lang) btn.lang = v.lang;
  btn.append(document.createTextNode(core));
  if (tag) {
    const sm = document.createElement("span");
    sm.className = "edition-lang-tag";
    sm.textContent = `(${tag})`;
    btn.append(document.createTextNode(" "), sm);
  }
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

export function removeReaderColumn(index, available = EDITION_STACK) {
  const order = orderedEditions(available);
  if (index < 0 || index >= order.length - 1) return order;
  order.splice(index, 1);
  writeEditionOrder(order);
  document.dispatchEvent(
    new CustomEvent("lsb:editions", { detail: { order, removed: index } })
  );
  return order;
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

export function mountActiveEditionBar(available = EDITION_STACK, opts = {}) {
  document.querySelector(".active-edition-bar")?.remove();
  closeEditionMenu();
  closeParallelsMenu();
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
  const activeLang = EDITIONS[active]?.lang;
  if (activeLang) blurb.lang = activeLang;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "edition-name-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  if (activeLang) btn.lang = activeLang;
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
  bar.append(
    blurb,
    editionNameCluster(btn, opts.parallels ? mountParallelsToggle() : null),
    spacer
  );

  const header = document.querySelector(".site-header");
  if (header) header.after(bar);
  else document.body.prepend(bar);
  syncParallelsTrigger();
  return bar;
}

function mountAddColumn(pool, used) {
  const unused = pool.filter((id) => EDITIONS[id] && !used.includes(id));
  if (!unused.length) return null;
  const nav = document.createElement("nav");
  nav.className = "edition-add-col";
  nav.setAttribute("aria-label", "Comparer");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "edition-add-col-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-label", "Comparer");
  btn.textContent = "comparer";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (document.querySelector(".edition-menu")) {
      closeEditionMenu();
      return;
    }
    openEditionMenu(btn, null, unused, (id) => {
      prependReaderColumn(id, pool);
    });
  });
  nav.append(btn);
  return nav;
}

function mountRemoveColumn(colIndex, pool) {
  const nav = document.createElement("nav");
  nav.className = "edition-remove-col";
  nav.setAttribute("aria-label", "Fermer la colonne");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "edition-remove-col-btn";
  btn.setAttribute("aria-label", "Fermer la colonne");
  btn.textContent = "×";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeEditionMenu();
    removeReaderColumn(colIndex, pool);
  });
  nav.append(btn);
  return nav;
}

function editionNameCluster(btn, extra) {
  const cluster = document.createElement("span");
  cluster.className = "edition-name-cluster";
  cluster.append(btn);
  if (extra) cluster.append(extra);
  return cluster;
}

function closeEditionMenu() {
  document.querySelector(".edition-menu")?.remove();
}

function closeParallelsMenu() {
  const menu = document.querySelector(".parallels-menu");
  menu?._ac?.abort();
  menu?.remove();
  document.querySelectorAll(".parallels-toggle-btn[aria-expanded='true']").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
}

function openParallelsMenu(anchor) {
  closeEditionMenu();
  closeParallelsMenu();
  const menu = document.createElement("ul");
  menu.className = "parallels-menu";

  for (const kind of Object.keys(KIND_LABEL)) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "parallels-menu-btn";
    btn.dataset.kind = kind;
    const mark = document.createElement("span");
    mark.className = "parallels-check";
    mark.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = KIND_LABEL[kind];
    const paint = () => {
      const on = parallelKindSelected(kind);
      mark.textContent = on ? "✓" : "";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    };
    paint();
    btn.append(mark, label);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setParallelKindEnabled(kind, !parallelKindSelected(kind));
      paint();
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
  anchor.setAttribute("aria-expanded", "true");

  const ac = new AbortController();
  menu._ac = ac;
  const onDoc = (e) => {
    if (menu.contains(e.target) || anchor.contains(e.target)) return;
    closeParallelsMenu();
  };
  const onKey = (e) => {
    if (e.key !== "Escape") return;
    closeParallelsMenu();
    anchor.focus();
  };
  document.addEventListener("pointerdown", onDoc, { capture: true, signal: ac.signal });
  document.addEventListener("keydown", onKey, { signal: ac.signal });
}

function openEditionMenu(anchor, currentId, stack, onPick, opts = {}) {
  closeParallelsMenu();
  closeEditionMenu();
  const others = editionsByYearDesc(
    (opts.ids || stack).filter((id) => id && id !== currentId)
  );
  if (!others.length) return;

  const menu = document.createElement("ul");
  menu.className = "edition-menu";
  menu.setAttribute("role", "listbox");

  for (const id of others) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    const btn = document.createElement("button");
    btn.type = "button";
    fillEditionMenuLabel(btn, id);
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

let headerHBound = false;

function syncHeaderHeight() {
  const header = document.querySelector(".site-header");
  if (!header?.querySelector(".header-volume")) return;
  document.documentElement.style.setProperty(
    "--header-h",
    `${Math.ceil(header.getBoundingClientRect().height)}px`
  );
}

function bindHeaderHeight() {
  if (headerHBound) return;
  headerHBound = true;
  window.addEventListener("resize", syncHeaderHeight);
}

/** Book tabs replace the centered "La Bible" link. Not used on the TOC. */
function placeVolumeInHeader(nav) {
  const header = document.querySelector(".site-header");
  if (!header) return false;
  nav.classList.remove("book-title-bar");
  nav.classList.add("header-volume");
  const old = header.querySelector(".header-volume") || header.querySelector(".nav-center");
  if (old) old.replaceWith(nav);
  else header.insertBefore(nav, header.querySelector(".nav-links"));
  bindHeaderHeight();
  requestAnimationFrame(syncHeaderHeight);
  return true;
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
  document.querySelector(".site-header .header-volume")?.remove();
  closeEditionMenu();
  closeParallelsMenu();

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
    const colLang = EDITIONS[item.id]?.lang;
    if (colLang) btn.lang = colLang;
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
    if (colIndex === labels.length - 1) wrap.classList.add("is-primary");
    wrap.append(editionNameCluster(btn));
    if (colIndex < labels.length - 1) wrap.append(mountRemoveColumn(colIndex, pool));
    if (colIndex === labels.length - 1) wrap.append(mountParallelsToggle());
    const add = mountAddColumn(pool, stack);
    if (add) wrap.append(add);
    stage.append(wrap);
  });
  nameBar.append(stage);

  const chrome = document.createElement("div");
  chrome.className = "reader-chrome";
  const inHeader = titleBar?.classList.contains("volume-bar") && placeVolumeInHeader(titleBar);
  if (titleBar && !inHeader) chrome.append(titleBar);
  chrome.append(nameBar);

  const header = document.querySelector(".site-header");
  if (header) header.after(chrome);
  else document.body.prepend(chrome);

  if (inHeader) document.body.style.setProperty("--book-bar-h", "0px");
  else if (titleBar) {
    document.body.style.setProperty("--book-bar-h", `${titleBar.offsetHeight}px`);
  }

  syncParallelsTrigger();
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
