/** Synopse NT + AT citations. One ParallelHost per verse surface (column, messe row, card). */

import { resolveUrls, loadVersionIndex } from "./data-loader.js";
import { MaskDilatation } from "./expand.js";
import { BOOK_BY_ID, bookHref } from "./books.js";
import { displayBookTitle, parallelKindEnabled } from "./editions.js";

const NT_URL = "data/parallels-nt.json";
const AT_URL = "data/citations-at.json";
const RAIL_INSET = 8;
const RAIL_LANE = 14;
const MAX_DEPTH = 8;

let packed = null;
let indexCache = null;
let hideGate = null;
let treeGen = 0;
const ctx = { bookId: "", edition: "", primaryCol: "" };

async function loadJson(file) {
  for (const url of resolveUrls(file)) {
    const res = await fetch(url);
    if (res.ok) return res.json();
  }
  return null;
}

function originKey(p) {
  return `${p.book}\t${JSON.stringify(p.spans || [])}`;
}

function passageDup(list, p) {
  return list.some(
    (q) => q.book === p.book && JSON.stringify(q.spans) === JSON.stringify(p.spans)
  );
}

function invertCitations(items) {
  const map = new Map();
  for (const item of items) {
    for (const p of item.passages || []) {
      const key = originKey(p);
      let rec = map.get(key);
      if (!rec) {
        rec = {
          id: `rev-${p.book}-${map.size}`,
          kind: "accomplissement",
          origin: {
            book: p.book,
            short: p.short,
            spans: p.spans,
            cites: p.cites,
          },
          passages: [],
          label: item.label,
        };
        map.set(key, rec);
      }
      if (item.origin && !passageDup(rec.passages, item.origin)) {
        rec.passages.push(item.origin);
      }
    }
  }
  return [...map.values()];
}

function fuseAccomplissementHits(group) {
  if (group.length === 1) return group[0];
  const min = Math.min(...group.map((h) => h.min));
  const max = Math.max(...group.map((h) => h.max));
  const passages = [];
  for (const h of group) {
    for (const p of h.item.passages || []) {
      if (!passageDup(passages, p)) passages.push(p);
    }
  }
  const item = {
    id: group.map((h) => h.item.id).join("+"),
    kind: "accomplissement",
    origin: group[0].item.origin,
    passages,
    label: group[0].item.label,
  };
  return {
    item,
    passage: group[0].passage,
    span: {
      chapter: group[0].span.chapter,
      ranges: [{ start: min, end: max >= 9000 ? null : max }],
    },
    min,
    max,
  };
}

function mergeAccomplissementHits(hits) {
  const acc = [];
  const other = [];
  for (const h of hits) {
    if (kindKey(h.item) === "accomplissement") acc.push(h);
    else other.push(h);
  }
  if (acc.length <= 1) return hits;
  const buckets = new Map();
  for (const h of acc) {
    const key = `${h.min}:${h.max}`;
    const list = buckets.get(key);
    if (list) list.push(h);
    else buckets.set(key, [h]);
  }
  return [...other, ...[...buckets.values()].map(fuseAccomplissementHits)];
}

async function loadPack() {
  if (packed) return packed;
  const [nt, at] = await Promise.all([loadJson(NT_URL), loadJson(AT_URL)]);
  const citations = at?.items || [];
  packed = {
    synopse: nt?.items || [],
    citations,
    reverse: invertCitations(citations),
  };
  return packed;
}

export async function prepareParallels(edition) {
  await loadPack();
  if (!edition) return packed;
  try {
    indexCache = await loadVersionIndex(edition);
  } catch {
    indexCache = null;
  }
  return packed;
}

function spanVerses(span) {
  const ranges = span?.ranges;
  if (!ranges || !ranges.length) return { all: true, min: 1, max: Infinity };
  let min = Infinity;
  let max = 0;
  const set = new Set();
  for (const r of ranges) {
    const a = r.start ?? 1;
    const b = r.end == null ? 9999 : r.end;
    min = Math.min(min, a);
    max = Math.max(max, b);
    if (b < 9000) {
      for (let n = a; n <= b; n++) set.add(n);
    }
  }
  return { all: ranges.some((r) => r.end == null), min, max, set };
}

function spanHasVerse(span, chapter, verse) {
  if (span.chapter !== chapter) return false;
  const v = spanVerses(span);
  if (v.all) return true;
  if (v.set && v.set.size) return v.set.has(verse);
  return verse >= v.min && verse <= v.max;
}

function spanOverlapsRanges(span, chapter, ranges, verseStart) {
  if (span.chapter !== chapter) return false;
  if (ranges?.length) {
    for (const r of ranges) {
      const a = r.start ?? 1;
      const b = r.end == null ? a : r.end;
      for (let n = a; n <= b; n++) {
        if (spanHasVerse(span, chapter, n)) return true;
      }
    }
    return false;
  }
  if (verseStart == null) return true;
  return spanHasVerse(span, chapter, verseStart);
}

function occKey(bookId, chapter, ranges) {
  return { bookId, chapter, ranges: ranges || null };
}

function spansOverlap(a, b) {
  if (!a?.bookId || !b?.bookId || a.bookId !== b.bookId) return false;
  if (a.chapter !== b.chapter) return false;
  if (!a.ranges || !b.ranges) return true;
  const va = spanVerses({ chapter: a.chapter, ranges: a.ranges });
  const vb = spanVerses({ chapter: b.chapter, ranges: b.ranges });
  if (va.all || vb.all) return true;
  if (va.set && vb.set && va.set.size && vb.set.size) {
    for (const n of va.set) if (vb.set.has(n)) return true;
    return false;
  }
  return va.min <= vb.max && vb.min <= va.max;
}

function passageOccupied(bookId, span, occupied) {
  const key = occKey(bookId, span.chapter, span.ranges);
  return occupied.some((o) => spansOverlap(key, o));
}

/** synopse | vetero | accomplissement */
export function kindKey(item) {
  if (item?.kind === "synopse") return "synopse";
  if (item?.kind === "accomplissement") return "accomplissement";
  return "vetero";
}

function railBags(item, bookId) {
  const k = kindKey(item);
  if (k === "synopse") {
    return (item.passages || []).filter((p) => p.book === bookId);
  }
  if (item.origin?.book === bookId) return [item.origin];
  return [];
}

function itemSpansOnBook(item, bookId) {
  return railBags(item, bookId).flatMap((p) =>
    (p.spans || []).map((sp) => ({ passage: p, span: sp }))
  );
}

function othersOf(item, bookId, chapter, verse, occupied = [], includeSelf = false) {
  const cur = currentSpan(item, bookId, chapter, verse);
  const out = [];
  for (const p of item.passages || []) {
    const spans = (p.spans || []).filter((sp) => {
      const isSelf =
        !!cur &&
        p.book === bookId &&
        sp.chapter === cur.span.chapter &&
        JSON.stringify(sp.ranges) === JSON.stringify(cur.span.ranges);
      if (kindKey(item) === "synopse" && !includeSelf && isSelf) return false;
      if (includeSelf && isSelf) return true;
      if (passageOccupied(p.book, sp, occupied)) return false;
      return true;
    });
    if (!spans.length) continue;
    out.push({
      ...p,
      spans,
      cites: spans.map((s) => citeOf(s)),
    });
  }
  return out;
}

function currentSpan(item, bookId, chapter, verse) {
  for (const hit of itemSpansOnBook(item, bookId)) {
    if (spanHasVerse(hit.span, chapter, verse)) return hit;
  }
  return null;
}

function citeOf(span) {
  const ch = span.chapter;
  const ranges = span.ranges;
  if (!ranges || !ranges.length) return String(ch);
  const bits = ranges.map((r) => {
    if (r.end == null) return `${r.start}–`;
    if (r.start === r.end) return String(r.start);
    return `${r.start}-${r.end}`;
  });
  return `${ch},${bits.join(".")}`;
}

function formatPassages(passages) {
  return passages
    .map((p) => `${p.short} ${p.cites.join(" ; ")}`)
    .join(" | ");
}

function stampSuffix(kind) {
  if (kind === "synopse") return "(synopte)";
  if (kind === "accomplissement") return "(accomplissement)";
  return "(suggestion de lecture vétérotestamentaire)";
}

function stampText(item, bookId, chapter, verse, occupied = [], includeSelf = false) {
  const others = othersOf(item, bookId, chapter, verse, occupied, includeSelf);
  const refs = formatPassages(others);
  const tag = stampSuffix(kindKey(item));
  return refs ? `${refs} ${tag}` : tag;
}

function itemsForBookChapter(bookId, chapter) {
  const pack = packed;
  if (!pack) return [];
  const all = [...pack.synopse, ...pack.citations, ...pack.reverse];
  const out = [];
  for (const item of all) {
    if (!parallelKindEnabled(kindKey(item))) continue;
    for (const hit of itemSpansOnBook(item, bookId)) {
      if (hit.span.chapter === chapter) out.push({ item, ...hit });
    }
  }
  return out;
}

function verseEls(pair, col) {
  return [...pair.querySelectorAll(`.verse[data-col="${col}"]`)];
}

function verseShown(el) {
  const zone = el.closest(".mask-zone");
  if (!zone) return true;
  const zr = zone.getBoundingClientRect();
  if (zr.height < 8) return false;
  const er = el.getBoundingClientRect();
  return er.bottom > zr.top + 2 && er.top < zr.bottom - 2;
}

function rangeEls(root, span, col) {
  const raw = col
    ? verseEls(root, col)
    : [...root.querySelectorAll(".verse[data-verse]")];
  const all = raw.filter((el) => {
    const nested = el.closest(".parallel-card");
    if (nested && nested !== root && root.contains(nested)) return false;
    return true;
  });
  const v = spanVerses(span);
  return all.filter((el) => {
    if (!verseShown(el)) return false;
    const n = +el.dataset.verse;
    if (v.all) return true;
    if (v.set && v.set.size) return v.set.has(n) || (v.max >= 9000 && n >= v.min);
    return n >= v.min && n <= Math.min(v.max, 9000);
  });
}

function chromeTop() {
  const bar =
    document.querySelector(".edition-name-bar") ||
    document.querySelector(".active-edition-bar") ||
    document.querySelector(".book-title-bar") ||
    document.querySelector(".site-header");
  return bar ? bar.getBoundingClientRect().bottom : 0;
}

function lireBase() {
  return /\/lire(\/|$)/.test(window.location.pathname) ? "" : "lire/";
}

function latinTitle(title) {
  return /^(Liber|Evangelium|Epistula|Actus|Apocalypsis)\b/i.test(title);
}

function greekTitle(title) {
  return /[Α-ω]/.test(title);
}

function stripGospelPrefix(title) {
  return String(title || "")
    .replace(/^Évangile\s+/i, "")
    .replace(/^Evangelium\s+/i, "")
    .replace(/^Εὐαγγέλιον\s+/i, "")
    .trim();
}

function psalmName(title) {
  if (greekTitle(title)) return "Ψαλμὸς";
  if (latinTitle(title) || /psalm/i.test(title)) return "Psalmus";
  return "Psaume";
}

function chapLabel(title) {
  if (greekTitle(title)) return "κεφ.";
  if (latinTitle(title)) return "Cap.";
  return "Chap.";
}

function verseBits(ranges) {
  if (!ranges || !ranges.length) return "";
  const parts = [];
  let allSingle = true;
  for (const r of ranges) {
    const a = r.start;
    const b = r.end;
    if (b == null || b >= 9000) {
      allSingle = false;
      parts.push(`${a} et suivants`);
    } else if (a === b) {
      parts.push(String(a));
    } else {
      allSingle = false;
      parts.push(`${a} à ${b}`);
    }
  }
  if (allSingle) {
    if (parts.length === 1) return `verset ${parts[0]}`;
    if (parts.length === 2) return `verset ${parts[0]} et ${parts[1]}`;
    const last = parts.pop();
    return `versets ${parts.join(", ")} et ${last}`;
  }
  return `versets ${parts.join(", ")}`;
}

function headingFor(bookId, span) {
  const fromIndex = indexCache?.books?.find((b) => b.id === bookId)?.title;
  const title = displayBookTitle(
    fromIndex || BOOK_BY_ID[bookId]?.title || bookId
  );
  const ch = span.chapter;
  const verses = verseBits(span.ranges);
  if (bookId === "psaumes" || bookId === "psaume-151") {
    const name = psalmName(title);
    return verses ? `${name} ${ch}, ${verses}` : `${name} ${ch}`;
  }
  const shortTitle = stripGospelPrefix(title);
  const chap = chapLabel(title);
  return verses
    ? `${shortTitle}. ${chap} ${ch}, ${verses}`
    : `${shortTitle}. ${chap} ${ch}`;
}

function assignLanes(hits) {
  const sorted = [...hits].sort((a, b) => a.min - b.min || a.max - b.max);
  const ends = [];
  for (const h of sorted) {
    let lane = 0;
    while (ends[lane] != null && h.min <= ends[lane]) lane += 1;
    ends[lane] = h.max;
    h.lane = lane;
  }
  return sorted;
}

function cardHost(edition, bookId, span, kind) {
  const art = document.createElement("article");
  art.className = "parallel-card";
  art.dataset.kind = kind;
  art.dataset.bookId = bookId;
  art.dataset.chapter = String(span.chapter);
  art._span = span;
  const head = document.createElement("a");
  head.className = "parallel-card-head";
  head.href = bookHref(bookId, lireBase(), {
    chapter: span.chapter,
    verse: span.ranges?.[0]?.start || null,
  });
  head.textContent = headingFor(bookId, span);
  const body = document.createElement("div");
  body.className = "parallel-card-body reading-mask-host";
  art.append(head, body);
  const ranges = (span.ranges || []).map((r) => ({
    start: r.start ?? 1,
    end: r.end == null ? 9999 : r.end,
  }));
  const dil = new MaskDilatation(body, {
    bookId,
    chapter: span.chapter,
    edition,
    ranges: ranges.length ? ranges : undefined,
    verseStart: ranges[0]?.start,
    verseEnd: ranges.length ? ranges[ranges.length - 1].end : undefined,
    lockPage: true,
  });
  dil.whenReady().catch(() => {
    body.textContent = "Passage indisponible.";
  });
  art._dil = dil;
  return art;
}

function fillCards(box, item, bookId, chapter, verse, edition, occupied, includeSelf) {
  box.replaceChildren();
  const kind = kindKey(item);
  box.dataset.kind = kind;
  box.dataset.itemId = item.id || "";
  const others = othersOf(
    item,
    bookId,
    chapter,
    verse,
    occupied,
    includeSelf
  );
  for (const p of others) {
    for (const sp of p.spans) {
      box.appendChild(cardHost(edition, p.book, sp, kind));
    }
  }
}

function alignCards(cards, originEl, col, span) {
  const excerpt = originEl.querySelector?.(".mask-excerpt");
  let els = excerpt ? rangeEls(excerpt, span, col || null) : [];
  if (!els.length) els = rangeEls(originEl, span, col || null);
  if (!els.length) return;
  const origin = originEl.getBoundingClientRect().top;
  const braceTop = els[0].getBoundingClientRect().top;
  const viewTop = chromeTop();
  const target = Math.max(braceTop, viewTop);
  cards.style.top = `${Math.max(0, target - origin)}px`;
  cards.style.marginTop = "";
  cards.dataset.synTop = String(target);
  cards.dataset.synScroll = String(window.scrollY);
  cards._span = span;
}

function cssMs(prop, fallback) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(prop)
    .trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  if (raw.endsWith("ms")) return n;
  if (raw.endsWith("s")) return n * 1000;
  return n;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)));
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function foldPromise(dil, instant) {
  if (!dil) return Promise.resolve();
  if (dil._collapsing) return dil._collapsing;
  if (dil.expanded) {
    return Promise.resolve(dil.collapse({ restoreScroll: false, instant }));
  }
  return Promise.resolve();
}

function emptyCards(el) {
  el.replaceChildren();
  el.classList.remove("is-open", "is-leaving");
  el.style.marginTop = "";
  el.style.top = "";
  el.setAttribute("aria-hidden", "true");
  delete el.dataset.kind;
  delete el.dataset.itemId;
  delete el._span;
}

function verseMin(span) {
  const v = spanVerses(span);
  return v.min === Infinity ? 1 : v.min;
}

async function foldBoxes(boxes, { instant = false, rails = [] } = {}) {
  rails.forEach((el) => el.classList.remove("is-open"));
  if (!boxes.length) return;
  const snap = instant || reducedMotion();
  const folds = [];
  for (const el of boxes) {
    el.classList.add("is-leaving");
    for (const card of el.querySelectorAll(".parallel-card")) {
      folds.push(foldPromise(card._dil, snap));
    }
  }
  if (folds.length) await Promise.all(folds);
  for (const el of boxes) el.classList.remove("is-open");
  if (!snap) await sleep(cssMs("--parallel-dur", 280) + 16);
  for (const el of boxes) emptyCards(el);
}

async function hideOpenCards(container, { instant = false } = {}) {
  if (hideGate) {
    await hideGate;
    return;
  }
  const run = (async () => {
    const boxes = [...container.querySelectorAll(".parallel-cards.is-open")];
    const rails = [...container.querySelectorAll(".parallel-rail.is-open")];
    await foldBoxes(boxes, { instant, rails });
    container.querySelectorAll(".has-nested").forEach((el) => {
      el.classList.remove("has-nested");
      el.style.marginRight = "";
    });
  })();
  hideGate = run;
  try {
    await run;
  } finally {
    if (hideGate === run) hideGate = null;
  }
}

function revealCards(cards) {
  cards.classList.remove("is-leaving");
  cards.setAttribute("aria-hidden", "false");
  void cards.offsetWidth;
  cards.classList.add("is-open");
}

function whenCardsReady(cards) {
  const waits = [...cards.querySelectorAll(":scope > .parallel-card")].map(
    (c) => c._dil?.whenReady?.() || Promise.resolve()
  );
  return Promise.allSettled(waits);
}

function makeRail(item, span, { top, height, left, right, lane }) {
  const rail = document.createElement("button");
  rail.type = "button";
  const kind = kindKey(item);
  rail.className = `parallel-rail parallel-rail--${kind}`;
  rail.dataset.kind = kind;
  rail.dataset.itemId = item.id || "";
  rail.style.top = `${top}px`;
  if (height != null) rail.style.height = `${Math.max(16, height)}px`;
  if (left != null) rail.style.left = `${left}px`;
  if (right != null) {
    rail.style.right = `${right}px`;
    rail.style.left = "auto";
  }
  rail._item = item;
  rail._span = span;
  rail._lane = lane || 0;
  return rail;
}

class ParallelHost {
  constructor(opts) {
    this.openSeq = 0;
    this.hideGate = null;
    this.assign(opts);
  }

  assign(opts) {
    this.root = opts.root;
    this.verseRoot = opts.verseRoot || opts.root;
    this.bookId = opts.bookId;
    this.chapter = +opts.chapter;
    this.ranges = opts.ranges || null;
    this.verseStart = opts.verseStart;
    this.edition = opts.edition;
    this.col = opts.col || null;
    this.depth = opts.depth || 0;
    this.parent = opts.parent || null;
    this.closeRoot = opts.closeRoot || null;
  }

  treeRoot() {
    let p = this;
    while (p.parent) p = p.parent;
    return p;
  }

  includeSelfFor(item) {
    return (
      this.depth === 0 &&
      kindKey(item) === "synopse" &&
      document.body.classList.contains("messe-page")
    );
  }

  occupied() {
    const out = [];
    const add = (bookId, chapter, ranges) => {
      if (!bookId || chapter == null || Number.isNaN(chapter)) return;
      out.push(occKey(bookId, chapter, ranges));
    };
    add(this.bookId, this.chapter, this.ranges);
    let p = this.parent;
    while (p) {
      add(p.bookId, p.chapter, p.ranges);
      p = p.parent;
    }
    const tree = this.treeRoot().root;
    tree.querySelectorAll(".parallel-card").forEach((card) => {
      if (card === this.root) return;
      const sp = card._span;
      if (!sp) return;
      add(card.dataset.bookId, sp.chapter, sp.ranges);
    });
    return out;
  }

  hits() {
    let raw = itemsForBookChapter(this.bookId, this.chapter);
    // Nested cards: whole chapter, then verseShown clips to the excerpt
    // until dilatation uncovers more. Depth-0 messe stays on the reading.
    if (this.depth === 0 && (this.ranges?.length || this.verseStart != null)) {
      raw = raw.filter((h) =>
        spanOverlapsRanges(h.span, this.chapter, this.ranges, this.verseStart)
      );
    }
    return mergeAccomplissementHits(
      raw.map((h) => {
        const v = spanVerses(h.span);
        return {
          ...h,
          min: v.all ? 1 : v.min,
          max: v.all ? 999 : Math.min(v.max, 9000),
        };
      })
    );
  }

  anchorRight() {
    if (this.col) {
      const sample = this.verseRoot.querySelector(
        `.verse[data-col="${this.col}"]`
      );
      if (sample) return sample.getBoundingClientRect().right;
    }
    return this.verseRoot.getBoundingClientRect().right;
  }

  railGeom(h) {
    const rr = this.root.getBoundingClientRect();
    const els = rangeEls(this.verseRoot, h.span, this.col || null);
    let top;
    let height;
    if (els.length) {
      const first = els[0];
      const last = els[els.length - 1];
      top = first.getBoundingClientRect().top - rr.top;
      height = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
    } else if (this.depth === 0 && !this.col) {
      const body =
        this.verseRoot.querySelector(".reading-mask-host, .reading-excerpt") ||
        this.verseRoot;
      const br = body.getBoundingClientRect();
      top = br.top - rr.top;
      height = br.height;
    } else {
      return null;
    }
    const left =
      this.anchorRight() - rr.left + RAIL_INSET + (h.lane || 0) * RAIL_LANE;
    return { top, height, left, lane: h.lane || 0 };
  }

  ensureCards() {
    let el = this.root.querySelector(":scope > .parallel-cards");
    if (el) return el;
    if (this.depth === 0 && this.root.classList.contains("chapter-pair")) {
      const band = this.root.closest(".chapter-band");
      el = band?.querySelector(":scope > .parallel-cards");
      if (el) {
        this.root.appendChild(el);
        return el;
      }
    }
    el = document.createElement("div");
    el.className = "parallel-cards";
    el.setAttribute("aria-hidden", "true");
    this.root.appendChild(el);
    return el;
  }

  clearOwnRails() {
    this.root.querySelectorAll(":scope > .parallel-rail").forEach((el) => el.remove());
    if (this.verseRoot && this.verseRoot !== this.root) {
      this.verseRoot.querySelectorAll(".parallel-rail").forEach((el) => {
        if (el.closest(".parallel-card")) return;
        el.remove();
      });
    }
  }

  paint({ preserveOpen = false } = {}) {
    if (this.depth > MAX_DEPTH) return;
    const openEl = this.root.querySelector(":scope > .parallel-cards.is-open");
    const openId = preserveOpen ? openEl?.dataset.itemId || "" : "";
    this.clearOwnRails();
    if (openEl?.dataset.kind && !parallelKindEnabled(openEl.dataset.kind)) {
      openEl.querySelectorAll(".parallel-card").forEach((card) => {
        if (card._dil?.expanded || card._dil?._collapsing) {
          card._dil.collapse({ restoreScroll: false, instant: true });
        }
      });
      emptyCards(openEl);
      this.root.classList.remove("has-nested");
      this.root.style.marginRight = "";
    }
    if (this.depth === 0 && !this.col) {
      this.root.style.position = "relative";
    }
    this.syncRails();
    if (openId) {
      this.root.querySelectorAll(":scope > .parallel-rail").forEach((rail) => {
        if (rail.dataset.itemId === openId) rail.classList.add("is-open");
      });
    }
    if (preserveOpen) {
      this.root
        .querySelectorAll(":scope > .parallel-cards > .parallel-card")
        .forEach((card) => card._cite?.paint({ preserveOpen: true }));
    }
    this.syncPush();
  }

  async hideOwn({ instant = false } = {}) {
    if (this.hideGate) {
      await this.hideGate;
      return;
    }
    const run = (async () => {
      const box = this.root.querySelector(":scope > .parallel-cards.is-open");
      const rails = [
        ...this.root.querySelectorAll(":scope > .parallel-rail.is-open"),
      ];
      await foldBoxes(box ? [box] : [], { instant, rails });
      this.root.classList.remove("has-nested");
      this.root.style.marginRight = "";
      this.syncPushUp();
    })();
    this.hideGate = run;
    try {
      await run;
    } finally {
      if (this.hideGate === run) this.hideGate = null;
    }
  }

  mountChild(art) {
    const span = art._span;
    if (!span) return;
    const host = new ParallelHost({
      root: art,
      verseRoot: art,
      bookId: art.dataset.bookId,
      chapter: span.chapter,
      ranges: span.ranges || null,
      edition: this.edition,
      col: null,
      depth: this.depth + 1,
      parent: this,
      closeRoot: this.closeRoot,
    });
    art._cite = host;
    host.paint();
    if (!art._citeRO) {
      art._citeRO = new ResizeObserver(() => {
        host.sync();
        this.syncPushUp();
      });
      art._citeRO.observe(art);
      const mask = art.querySelector(".chapter-mask");
      if (mask) art._citeRO.observe(mask);
    }
  }

  async open(rail) {
    if (this.depth > MAX_DEPTH) return;
    const seq = ++this.openSeq;
    const gen = treeGen;
    if (this.depth === 0) {
      treeGen += 1;
      const myGen = treeGen;
      await hideOpenCards(this.closeRoot || document);
      if (myGen !== treeGen) return;
    } else {
      if (hideGate) await hideGate;
      if (gen !== treeGen) return;
      await this.hideOwn();
    }
    if (seq !== this.openSeq) return;
    const item = rail._item;
    const span = rail._span;
    const cards = this.ensureCards();
    const includeSelf = this.includeSelfFor(item);
    fillCards(
      cards,
      item,
      this.bookId,
      span.chapter,
      verseMin(span),
      this.edition,
      this.occupied(),
      includeSelf
    );
    if (!cards.children.length) {
      emptyCards(cards);
      this.root.classList.remove("has-nested");
      this.syncPushUp();
      return;
    }
    alignCards(cards, this.root, this.col, span);
    await whenCardsReady(cards);
    if (seq !== this.openSeq) return;
    if (this.depth > 0 && gen !== treeGen) return;
    for (const art of cards.querySelectorAll(":scope > .parallel-card")) {
      this.mountChild(art);
    }
    revealCards(cards);
    rail.classList.add("is-open");
    if (this.depth > 0) this.root.classList.add("has-nested");
    this.syncPushUp();
  }

  hitKey(item, span) {
    return `${item?.id || ""}\t${span?.chapter ?? ""}\t${JSON.stringify(span?.ranges ?? null)}`;
  }

  placeRail(h, occupied) {
    const includeSelf = this.includeSelfFor(h.item);
    const others = othersOf(
      h.item,
      this.bookId,
      this.chapter,
      h.min,
      occupied,
      includeSelf
    );
    if (!others.length) return null;
    const box = this.railGeom(h);
    if (!box) return null;
    const rail = makeRail(h.item, h.span, box);
    rail.dataset.hitKey = this.hitKey(h.item, h.span);
    rail.setAttribute(
      "aria-label",
      stampText(h.item, this.bookId, this.chapter, h.min, occupied, includeSelf)
    );
    rail._host = this;
    rail._open = () => this.open(rail);
    return rail;
  }

  syncRails() {
    const occupied = this.occupied();
    const hits = assignLanes(this.hits());
    const existing = [...this.root.querySelectorAll(":scope > .parallel-rail")];
    const byKey = new Map(
      existing.map((r) => [r.dataset.hitKey || this.hitKey(r._item, r._span), r])
    );
    const used = new Set();
    for (const h of hits) {
      const key = this.hitKey(h.item, h.span);
      const includeSelf = this.includeSelfFor(h.item);
      const others = othersOf(
        h.item,
        this.bookId,
        this.chapter,
        h.min,
        occupied,
        includeSelf
      );
      const box = others.length ? this.railGeom(h) : null;
      const rail = byKey.get(key);
      if (!box) {
        if (rail && !rail.classList.contains("is-open")) rail.remove();
        continue;
      }
      if (rail) {
        rail.style.top = `${box.top}px`;
        rail.style.height = `${Math.max(16, box.height)}px`;
        rail.style.left = `${box.left}px`;
        rail._lane = h.lane || 0;
        used.add(rail);
      } else {
        const made = this.placeRail(h, occupied);
        if (made) {
          this.root.appendChild(made);
          used.add(made);
        }
      }
    }
    for (const rail of existing) {
      if (used.has(rail)) continue;
      if (rail.classList.contains("is-open")) {
        const box = this.railGeom({
          span: rail._span,
          lane: rail._lane || 0,
        });
        if (!box && !this.hideGate) this.hideOwn({ instant: true });
        continue;
      }
      rail.remove();
    }
    const cards = this.root.querySelector(":scope > .parallel-cards.is-open");
    if (!cards) return;
    const rail =
      this.root.querySelector(":scope > .parallel-rail.is-open") ||
      this.root.querySelector(":scope > .parallel-rail");
    const span = cards._span || rail?._span;
    if (span) alignCards(cards, this.root, this.col, span);
  }

  syncPush() {
    if (this.depth === 0) return;
    const box = this.root.querySelector(":scope > .parallel-cards");
    const open = box?.classList.contains("is-open");
    if (!open || !box) {
      if (this.root.style.marginRight) this.root.style.marginRight = "";
      this.root.classList.remove("has-nested");
      return;
    }
    this.root.classList.add("has-nested");
    const push = Math.max(
      0,
      box.getBoundingClientRect().right - this.root.getBoundingClientRect().right
    );
    const next = push ? `${Math.round(push)}px` : "";
    if (this.root.style.marginRight !== next) this.root.style.marginRight = next;
  }

  syncPushUp() {
    this.syncPush();
    this.parent?.syncPushUp();
  }

  sync() {
    this.syncRails();
    this.root
      .querySelectorAll(":scope > .parallel-cards > .parallel-card")
      .forEach((card) => card._cite?.sync());
    this.syncPush();
  }
}

function bindHost(el, opts) {
  if (el._cite) {
    el._cite.assign(opts);
    return el._cite;
  }
  const host = new ParallelHost(opts);
  el._cite = host;
  return host;
}

function ensureStamp() {
  let stamp = document.querySelector(".parallel-stamp");
  if (stamp) return stamp;
  stamp = document.createElement("div");
  stamp.className = "parallel-stamp";
  stamp.hidden = true;
  document.body.appendChild(stamp);
  return stamp;
}

function bindGlobal() {
  if (document.documentElement.dataset.parallelsBound) return;
  document.documentElement.dataset.parallelsBound = "1";

  document.addEventListener("pointerover", (e) => {
    const rail = e.target.closest(".parallel-rail");
    if (!rail || !rail._item) return;
    const s = ensureStamp();
    const host = rail._host;
    const pair = rail.closest(".chapter-pair");
    const reading =
      rail.closest(".reading-card") ||
      rail.closest(".reading-row")?.querySelector(".reading-card");
    const card = rail.closest(".parallel-card");
    const chapter = host
      ? host.chapter
      : pair
        ? +pair.dataset.chapter
        : +(reading?.dataset.chapter || rail._span?.chapter || 0);
    const bookId =
      host?.bookId ||
      card?.dataset.bookId ||
      pair?.closest("[data-book]")?.dataset.book ||
      reading?.dataset.bookId ||
      ctx.bookId;
    const occupied = host?.occupied?.() || [];
    const includeSelf = host
      ? host.includeSelfFor(rail._item)
      : kindKey(rail._item) === "synopse" &&
        document.body.classList.contains("messe-page");
    s.textContent = stampText(
      rail._item,
      bookId,
      chapter,
      spanVerses(rail._span).min,
      occupied,
      includeSelf
    );
    s.hidden = false;
    s.style.left = `${rail.getBoundingClientRect().right + 8}px`;
    s.style.top = `${e.clientY}px`;
    s.style.position = "fixed";
    s.style.transform = "translateY(-50%)";
  });

  document.addEventListener("pointermove", (e) => {
    const rail = e.target.closest(".parallel-rail");
    const stamp = document.querySelector(".parallel-stamp");
    if (!rail || !stamp || stamp.hidden) return;
    stamp.style.top = `${e.clientY}px`;
  });

  document.addEventListener("pointerout", (e) => {
    const rail = e.target.closest(".parallel-rail");
    if (!rail) return;
    const stamp = document.querySelector(".parallel-stamp");
    const to = e.relatedTarget;
    if (to && (rail.contains(to) || stamp?.contains(to))) return;
    if (stamp) stamp.hidden = true;
  });

  document.addEventListener("click", (e) => {
    const rail = e.target.closest(".parallel-rail");
    if (!rail) return;
    e.preventDefault();
    e.stopPropagation();
    const stamp = document.querySelector(".parallel-stamp");
    if (stamp) stamp.hidden = true;
    rail._open?.();
  });

  document.addEventListener("lsb:maskpin", (e) => {
    const start = e.target.closest?.(".parallel-card, .reading-row, .chapter-pair");
    if (!start) return;
    const host =
      start._cite ||
      start.closest(".reading-row")?._cite ||
      start.closest(".chapter-pair")?._cite;
    if (!host) return;
    host.sync();
    host.parent?.syncPushUp();
  });
}

export async function mountParallels({ bookId, container, editions }) {
  if (!container || !bookId) return;
  ctx.bookId = bookId;
  const primary =
    (editions || []).find((ed) => ed.primary) || (editions || []).at(-1);
  ctx.primaryCol = primary?.col || "";
  ctx.edition = primary?.book?.version?.id || primary?.col || "";
  await prepareParallels(ctx.edition);
  bindGlobal();
  const pairs = container.querySelectorAll(".chapter-pair");
  for (const pair of pairs) {
    const chapter = +pair.dataset.chapter;
    const host = bindHost(pair, {
      root: pair,
      verseRoot: pair,
      bookId,
      chapter,
      ranges: null,
      edition: ctx.edition,
      col: ctx.primaryCol,
      depth: 0,
      parent: null,
      closeRoot: container,
    });
    host.paint({ preserveOpen: true });
  }
}

export function formatFullRef(bookId, chapter, verseStart, verseEnd, ranges) {
  return headingFor(bookId, {
    chapter,
    ranges: ranges?.length
      ? ranges
      : verseStart
        ? [{ start: verseStart, end: verseEnd || verseStart }]
        : null,
  });
}

export async function attachExcerptParallels({
  host,
  row,
  bookId,
  chapter,
  verseStart,
  ranges,
  edition,
}) {
  if (!host || !bookId) return;
  await prepareParallels(edition);
  bindGlobal();
  const band = row || host.parentElement;
  if (!band) return;
  const surface = bindHost(band, {
    root: band,
    verseRoot: host,
    bookId,
    chapter,
    ranges: ranges || null,
    verseStart,
    edition,
    col: null,
    depth: 0,
    parent: null,
    closeRoot: band.parentElement || document,
  });
  surface.paint({ preserveOpen: true });
  surface.sync();
  if (!band._railRO) {
    band._railRO = new ResizeObserver(() => surface.sync());
    band._railRO.observe(host);
    const mask = host.querySelector(".chapter-mask");
    if (mask) band._railRO.observe(mask);
  }
}
