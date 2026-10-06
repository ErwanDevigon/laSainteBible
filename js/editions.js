/** Edition registry, cookie order, chrome. */

import {
  BOOK_BY_ID,
  GOSPEL_IDS,
  TOC_SECTIONS,
  VERSIONS,
  bookHref,
  bookName,
  versionIdsByYear,
} from "./books.js";
import {
  loadQumranCatalog,
  qumranScrollsFor,
  qumranSiglum,
  readQumranChoice,
  writeQumranChoice,
} from "./data-loader.js";

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

const LANG_TAG = { fr: "fr", la: "la", el: "el", he: "he", ar: "ar" };
const RTL_LANG = new Set(["he", "ar"]);

function editionMenuName(id, native) {
  const v = EDITIONS[id];
  let name = editionName(id);
  if (native && v?.blurb && (v.lang === "el" || RTL_LANG.has(v.lang))) {
    name = String(v.blurb).split("·")[0].trim() || name;
  }
  return name;
}

/** Dropdown only: name in the edition language + date. Sub-bars untouched. */
export function editionMenuLabel(id) {
  const v = EDITIONS[id];
  const year = editionYearShort(id);
  const name = editionMenuName(id, true);
  const tag = id === "qumran" ? "" : (LANG_TAG[v?.lang] || v?.lang || "");
  const core = year ? `${name} · ${year}` : name;
  return tag ? `${core} (${tag})` : core;
}

/** LTR row: title, then date, then (lg). RTL titles stay isolated so the date stays on the right. */
function paintEditionControl(btn, id, { year = true, tag = false, native = false } = {}) {
  const v = EDITIONS[id];
  const y = year ? editionYearShort(id) : "";
  const name = editionMenuName(id, native);
  const langTag = id === "qumran" ? "" : (LANG_TAG[v?.lang] || v?.lang || "");
  btn.replaceChildren();
  btn.dir = "ltr";
  const nameEl = document.createElement("span");
  nameEl.className = "edition-menu-name";
  if (v?.lang) nameEl.lang = v.lang;
  if (RTL_LANG.has(v?.lang)) nameEl.dir = "rtl";
  nameEl.textContent = name;
  btn.append(nameEl);
  if (y) btn.append(document.createTextNode(` · ${y}`));
  if (tag && langTag) {
    const sm = document.createElement("span");
    sm.className = "edition-lang-tag";
    sm.textContent = `(${langTag})`;
    btn.append(document.createTextNode(" "), sm);
  }
}

function fillEditionMenuLabel(btn, id) {
  paintEditionControl(btn, id, { year: true, tag: true, native: true });
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
  const activeLang = EDITIONS[active]?.lang;
  if (opts.showBlurb === false) {
    blurb.setAttribute("aria-hidden", "true");
  } else {
    blurb.textContent = editionBlurbDatedCanon(active);
    if (activeLang) blurb.lang = activeLang;
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "edition-name-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  paintEditionControl(btn, active, { year: !!opts.dated, tag: false, native: false });
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
  if (opts.lift) {
    const center = document.createElement("div");
    center.className = "header-center";
    center.append(btn);
    placeHeaderCenter(center);
    if (opts.barCenter) {
      const mid = opts.barCenter;
      mid.classList.add("edition-bar-center");
      bar.append(blurb, mid, spacer);
    } else {
      bar.append(blurb, spacer);
    }
    if (opts.parallels) bar.append(mountParallelsToggle());
  } else {
    bar.append(
      blurb,
      editionNameCluster(btn, opts.parallels ? mountParallelsToggle() : null),
      spacer
    );
  }

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

function closeQumranMenu() {
  document.querySelector(".qumran-menu")?.remove();
  document.querySelectorAll(".qumran-ms-btn[aria-expanded='true']").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
}

function closeEditionMenu() {
  closeQumranMenu();
  document.querySelector(".edition-menu")?.remove();
}

function mountQumranMs(bookId) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "qumran-ms-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Manuscrit");
  btn.textContent = "…";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.getAttribute("aria-expanded") === "true") {
      closeQumranMenu();
      return;
    }
    openQumranMenu(btn, bookId);
  });
  loadQumranCatalog().then((cat) => {
    if (!btn.isConnected) return;
    const list = qumranScrollsFor(bookId, cat);
    const wanted = readQumranChoice(bookId);
    const id = list.includes(wanted) ? wanted : list[0];
    btn.textContent = id ? qumranSiglum(cat, id) : "—";
    btn.dataset.scroll = id || "";
  });
  return btn;
}

function openQumranMenu(anchor, bookId) {
  closeEditionMenu();
  closeParallelsMenu();
  closeVolumeMenu();
  loadQumranCatalog().then((cat) => {
    if (!anchor.isConnected) return;
    const list = qumranScrollsFor(bookId, cat);
    if (!list.length) return;
    const wanted = readQumranChoice(bookId);
    const current = list.includes(wanted) ? wanted : list[0];

    const menu = document.createElement("ul");
    menu.className = "qumran-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", "Manuscrit");

    for (const id of list) {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = qumranSiglum(cat, id);
      if (id === current) {
        btn.classList.add("is-current");
        btn.setAttribute("aria-current", "true");
      }
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeQumranMenu();
        if (id === current) return;
        writeQumranChoice(bookId, id);
        anchor.textContent = qumranSiglum(cat, id);
        anchor.dataset.scroll = id;
        document.dispatchEvent(
          new CustomEvent("lsb:qumran", { detail: { bookId, scroll: id } })
        );
      });
      li.append(btn);
      menu.append(li);
    }

    const foot = document.createElement("li");
    foot.className = "qumran-credit";
    const license = document.createElement("a");
    license.href = cat?.license || "https://creativecommons.org/licenses/by-nc/4.0/";
    license.target = "_blank";
    license.rel = "noopener noreferrer";
    license.textContent = cat?.credit || "Martin Abegg, ETCBC, licence CC BY-NC 4.0";
    const source = document.createElement("a");
    source.href = cat?.source || "https://github.com/ETCBC/dss";
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "ETCBC/dss";
    foot.append(license, document.createTextNode(" · "), source);
    menu.append(foot);

    document.body.append(menu);
    const currentBtn = menu.querySelector("button.is-current");
    currentBtn?.scrollIntoView({ block: "nearest" });
    const r = anchor.getBoundingClientRect();
    const mw = menu.getBoundingClientRect().width;
    let left = r.left + r.width / 2 - mw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${r.bottom + 4}px`;
    anchor.setAttribute("aria-expanded", "true");

    const onDoc = (e) => {
      if (menu.contains(e.target) || anchor.contains(e.target)) return;
      closeQumranMenu();
      document.removeEventListener("pointerdown", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      closeQumranMenu();
      document.removeEventListener("pointerdown", onDoc, true);
      document.removeEventListener("keydown", onKey);
      anchor.focus();
    };
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onKey);
  });
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
  closeVolumeMenu();
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
  closeVolumeMenu();
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
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  if (h > 0) document.documentElement.style.setProperty("--header-h", `${h}px`);
}

function bindHeaderHeight() {
  if (headerHBound) return;
  headerHBound = true;
  window.addEventListener("resize", syncHeaderHeight);
  document.fonts?.ready?.then(() => syncHeaderHeight());
}

function placeHeaderCenter(node) {
  const header = document.querySelector(".site-header");
  if (!header || !node) return false;
  node.classList.add("header-center");
  const old =
    header.querySelector(".header-center") ||
    header.querySelector(".header-volume") ||
    header.querySelector(".header-books") ||
    header.querySelector(".nav-center");
  if (old) old.replaceWith(node);
  else header.insertBefore(node, header.querySelector(".nav-links"));
  bindHeaderHeight();
  requestAnimationFrame(syncHeaderHeight);
  return true;
}

function closeVolumeMenu() {
  const menu = document.querySelector(".volume-menu");
  menu?._ac?.abort();
  menu?.remove();
  document.querySelectorAll(".volume-menu-btn[aria-expanded='true']").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
}

function openVolumeMenu(anchor, bookId, peers) {
  closeEditionMenu();
  closeParallelsMenu();
  closeVolumeMenu();
  const menu = document.createElement("ul");
  menu.className = "volume-menu";
  menu.setAttribute("role", "listbox");
  const base = apostleBase();
  for (const book of peers) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    const a = document.createElement("a");
    a.href = bookHref(book.id, base);
    a.textContent = bookName(book) || book.title || book.id;
    if (book.id === bookId) {
      a.setAttribute("aria-current", "page");
      a.classList.add("is-current");
    }
    li.append(a);
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
    closeVolumeMenu();
  };
  const onKey = (e) => {
    if (e.key !== "Escape") return;
    closeVolumeMenu();
    anchor.focus();
  };
  document.addEventListener("pointerdown", onDoc, { capture: true, signal: ac.signal });
  document.addEventListener("keydown", onKey, { signal: ac.signal });
}

function mountBookMenu(bookId, peers) {
  const section = TOC_SECTIONS.find((s) => s.ids.includes(bookId));
  const label = section?.label || bookName(BOOK_BY_ID[bookId]) || bookId;
  const wrap = document.createElement("div");
  wrap.className = "header-center header-books";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "volume-menu-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  btn.textContent = label;
  const items =
    peers && peers.length
      ? peers
      : [{ id: bookId, ...(BOOK_BY_ID[bookId] || {}) }];
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (document.querySelector(".volume-menu")) {
      closeVolumeMenu();
      return;
    }
    openVolumeMenu(btn, bookId, items);
  });
  wrap.append(btn);
  return wrap;
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
  closeVolumeMenu();

  const stack = labels.map((item) => item.id).filter(Boolean);
  const pool = available && available.length ? available : stack;
  mountHeaderTranslation();

  if (bookId) placeHeaderCenter(mountBookMenu(bookId, peers));

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
    paintEditionControl(btn, item.id, { year: true, tag: false, native: false });
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
    const ms = item.id === "qumran" && bookId ? mountQumranMs(bookId) : null;
    wrap.append(editionNameCluster(btn, ms));
    if (colIndex === 0) {
      const add = mountAddColumn(pool, stack);
      if (add) wrap.append(add);
    }
    if (colIndex < labels.length - 1) wrap.append(mountRemoveColumn(colIndex, pool));
    if (colIndex === labels.length - 1) wrap.append(mountParallelsToggle());
    stage.append(wrap);
  });
  nameBar.append(stage);

  const chrome = document.createElement("div");
  chrome.className = "reader-chrome";
  chrome.append(nameBar);

  const header = document.querySelector(".site-header");
  if (header) header.after(chrome);
  else document.body.prepend(chrome);

  document.body.style.setProperty("--book-bar-h", "0px");
  bindHeaderHeight();
  requestAnimationFrame(syncHeaderHeight);

  syncParallelsTrigger();
  return { nameBar, chrome };
}

/** Homepage / index: single centered name, like messe. */
export function mountSiteEditionBar(available = EDITION_STACK, opts = {}) {
  return mountActiveEditionBar(available, opts);
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
