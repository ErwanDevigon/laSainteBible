/** Synopse NT + AT citations: rails on the main column only. */

import { resolveUrls, loadVersionIndex } from "./data-loader.js";
import { MaskDilatation } from "./expand.js";
import { BOOK_BY_ID, bookHref } from "./books.js";
import { displayBookTitle, parallelKindEnabled } from "./editions.js";

const NT_URL = "data/parallels-nt.json";
const AT_URL = "data/citations-at.json";
const RAIL_INSET = 8;
const RAIL_LANE = 14;

let packed = null;
let indexCache = null;

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
  const ranges = span.ranges;
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

function othersOf(item, bookId, chapter, verse) {
  const cur = currentSpan(item, bookId, chapter, verse);
  const out = [];
  for (const p of item.passages || []) {
    const spans = (p.spans || []).filter((sp) => {
      if (kindKey(item) !== "synopse" || !cur) return true;
      return !(
        p.book === bookId &&
        sp.chapter === cur.span.chapter &&
        JSON.stringify(sp.ranges) === JSON.stringify(cur.span.ranges)
      );
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

function stampText(item, bookId, chapter, verse) {
  const others = othersOf(item, bookId, chapter, verse);
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

function rangeEls(root, span, col) {
  const all = col
    ? verseEls(root, col)
    : [...root.querySelectorAll(".verse[data-verse]")];
  const v = spanVerses(span);
  const visible = all.filter((el) => {
    const zone = el.closest(".mask-zone");
    if (zone && getComputedStyle(zone).maxHeight === "0px") return false;
    return true;
  });
  const pool = visible.length ? visible : all;
  return pool.filter((el) => {
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

function clearRails(container, { preserveOpen = false } = {}) {
  container.querySelectorAll(".parallel-rail").forEach((el) => el.remove());
  container.querySelectorAll(".parallel-layer").forEach((el) => el.remove());
  container.querySelectorAll(".parallel-cards").forEach((el) => {
    const kind = el.dataset.kind;
    if (preserveOpen && el.classList.contains("is-open") && kind && parallelKindEnabled(kind)) {
      return;
    }
    el.querySelectorAll(".parallel-card").forEach((card) => {
      if (card._dil?.expanded) {
        card._dil.collapse({ restoreScroll: false, instant: true });
      }
    });
    el.replaceChildren();
    el.classList.remove("is-open");
    el.style.marginTop = "";
    el.style.top = "";
    delete el.dataset.kind;
    delete el.dataset.itemId;
  });
}

function cardHost(edition, bookId, span, kind) {
  const art = document.createElement("article");
  art.className = "parallel-card";
  art.dataset.kind = kind;
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

function fillCards(box, item, bookId, chapter, verse, edition) {
  box.replaceChildren();
  const kind = kindKey(item);
  box.dataset.kind = kind;
  box.dataset.itemId = item.id || "";
  const others = othersOf(item, bookId, chapter, verse);
  for (const p of others) {
    for (const sp of p.spans) {
      box.appendChild(cardHost(edition, p.book, sp, kind));
    }
  }
}

function alignCards(cards, pair, col, span) {
  const els = rangeEls(pair, span, col);
  if (!els.length) return;
  const origin = pair.getBoundingClientRect().top;
  const braceTop = els[0].getBoundingClientRect().top;
  const viewTop = chromeTop();
  const target = Math.max(braceTop, viewTop);
  cards.style.top = `${Math.max(0, target - origin)}px`;
  cards.style.marginTop = "";
  cards.dataset.synTop = String(target);
  cards.dataset.synScroll = String(window.scrollY);
}

function closeOpenCards(container) {
  container.querySelectorAll(".parallel-cards.is-open").forEach((el) => {
    el.querySelectorAll(".parallel-card").forEach((card) => {
      if (card._dil?.expanded) {
        card._dil.collapse({ restoreScroll: false, instant: true });
      }
    });
    el.replaceChildren();
    el.classList.remove("is-open");
    el.style.marginTop = "";
    el.style.top = "";
    delete el.dataset.kind;
    delete el.dataset.itemId;
  });
  container.querySelectorAll(".parallel-rail.is-open").forEach((el) => {
    el.classList.remove("is-open");
  });
}

function ensureCards(pair) {
  let el = pair.querySelector(":scope > .parallel-cards");
  if (el) return el;
  const band = pair.closest(".chapter-band");
  el = band?.querySelector(":scope > .parallel-cards");
  if (el) {
    pair.appendChild(el);
    return el;
  }
  el = document.createElement("div");
  el.className = "parallel-cards";
  pair.appendChild(el);
  return el;
}

function openFromRail(rail, ctx) {
  const pair = rail.closest(".chapter-pair");
  if (!pair) return;
  const container = pair.closest("[data-book-body]") || pair.closest(".book-body");
  closeOpenCards(container || document);
  const item = rail._item;
  const span = rail._span;
  const cards = ensureCards(pair);
  fillCards(
    cards,
    item,
    ctx.bookId,
    span.chapter,
    spanVerses(span).min === Infinity ? 1 : spanVerses(span).min,
    ctx.edition
  );
  alignCards(cards, pair, ctx.primaryCol, span);
  cards.classList.add("is-open");
  rail.classList.add("is-open");
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

function paintRails(container, ctx) {
  clearRails(container, { preserveOpen: true });
  const col = ctx.primaryCol;
  if (!col) return;
  const open = new Map();
  container.querySelectorAll(".parallel-cards.is-open").forEach((el) => {
    const pair =
      el.closest(".chapter-pair") ||
      el.closest(".chapter-band")?.querySelector(".chapter-pair");
    if (pair) open.set(pair, el.dataset.itemId || "");
  });
  const pairs = container.querySelectorAll(".chapter-pair");
  for (const pair of pairs) {
    const chapter = +pair.dataset.chapter;
    const hitsRaw = itemsForBookChapter(ctx.bookId, chapter);
    const hits = mergeAccomplissementHits(
      hitsRaw.map((h) => {
        const v = spanVerses(h.span);
        return {
          ...h,
          min: v.all ? 1 : v.min,
          max: v.all ? 999 : Math.min(v.max, 9000),
        };
      })
    );
    assignLanes(hits);
    const sample = pair.querySelector(`.verse[data-col="${col}"]`);
    if (!sample) continue;
    const pr = pair.getBoundingClientRect();
    const colRight = sample.getBoundingClientRect().right - pr.left;
    const openId = open.get(pair);
    for (const h of hits) {
      const els = rangeEls(pair, h.span, col);
      if (!els.length) continue;
      const first = els[0];
      const last = els[els.length - 1];
      const top = first.getBoundingClientRect().top - pr.top;
      const height = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
      const rail = makeRail(h.item, h.span, {
        top,
        height,
        left: colRight + RAIL_INSET + h.lane * RAIL_LANE,
        lane: h.lane,
      });
      rail.setAttribute(
        "aria-label",
        stampText(h.item, ctx.bookId, chapter, h.min)
      );
      rail._open = () => openFromRail(rail, ctx);
      if (openId && openId === (h.item.id || "")) rail.classList.add("is-open");
      pair.appendChild(rail);
    }
  }
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
    const pair = rail.closest(".chapter-pair");
    const host =
      rail.closest(".reading-card") ||
      rail.closest(".reading-row")?.querySelector(".reading-card");
    const chapter = pair
      ? +pair.dataset.chapter
      : +(host?.dataset.chapter || rail._span?.chapter || 0);
    const bookId =
      pair?.closest("[data-book]")?.dataset.book ||
      host?.dataset.bookId ||
      ctx.bookId;
    s.textContent = stampText(
      rail._item,
      bookId,
      chapter,
      spanVerses(rail._span).min
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
}

const ctx = { bookId: "", edition: "", primaryCol: "" };

export async function mountParallels({ bookId, container, editions }) {
  if (!container || !bookId) return;
  ctx.bookId = bookId;
  const primary = (editions || []).find((ed) => ed.primary) || (editions || []).at(-1);
  ctx.primaryCol = primary?.col || "";
  ctx.edition = primary?.book?.version?.id || primary?.col || "";
  await prepareParallels(ctx.edition);
  paintRails(container, ctx);
  bindGlobal();
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

function placeRailOnRow(row, card, item, span, lane) {
  const rr = row.getBoundingClientRect();
  const excerpt = card.querySelector(".mask-excerpt") || card;
  let els = rangeEls(excerpt, span, null);
  if (!els.length) els = rangeEls(card, span, null);
  let top;
  let height;
  if (els.length) {
    const first = els[0];
    const last = els[els.length - 1];
    top = first.getBoundingClientRect().top - rr.top;
    height = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
  } else {
    const body = card.querySelector(".reading-mask-host, .reading-excerpt") || card;
    const br = body.getBoundingClientRect();
    top = br.top - rr.top;
    height = br.height;
  }
  const left =
    card.getBoundingClientRect().right - rr.left + RAIL_INSET + lane * RAIL_LANE;
  return makeRail(item, span, { top, height, left, lane });
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
  host.querySelectorAll(".parallel-rail").forEach((el) => el.remove());
  host
    .querySelectorAll(".chapter-mask, .reading-mask-host")
    .forEach((el) => {
      el.querySelectorAll(".parallel-rail").forEach((r) => r.remove());
    });
  const band = row || host.parentElement;
  band?.querySelectorAll(":scope > .parallel-rail").forEach((el) => el.remove());
  if (band) {
    const cards = band.querySelector(":scope > .parallel-cards");
    if (cards && cards.dataset.kind && !parallelKindEnabled(cards.dataset.kind)) {
      cards.querySelectorAll(".parallel-card").forEach((card) => {
        if (card._dil?.expanded) {
          card._dil.collapse({ restoreScroll: false, instant: true });
        }
      });
      cards.replaceChildren();
      cards.classList.remove("is-open");
    }
  }
  host.dataset.bookId = bookId;
  host.dataset.chapter = String(chapter);
  const hitsRaw = itemsForBookChapter(bookId, chapter).filter((h) =>
    spanOverlapsRanges(h.span, chapter, ranges, verseStart)
  );
  if (!hitsRaw.length || !band) return;
  const hits = mergeAccomplissementHits(
    hitsRaw.map((h) => {
      const v = spanVerses(h.span);
      return {
        ...h,
        min: v.all ? 1 : v.min,
        max: v.all ? 999 : Math.min(v.max, 9000),
      };
    })
  );
  assignLanes(hits);
  band.style.position = "relative";
  hits.forEach((h) => {
    const rail = placeRailOnRow(band, host, h.item, h.span, h.lane);
    if (!rail) return;
    rail.setAttribute(
      "aria-label",
      stampText(h.item, bookId, chapter, verseStart || h.min)
    );
    rail._open = () => {
      closeOpenCards(band.parentElement || document);
      let cards = band.querySelector(":scope > .parallel-cards");
      if (!cards) {
        cards = document.createElement("div");
        cards.className = "parallel-cards";
        band.appendChild(cards);
      }
      fillCards(cards, h.item, bookId, chapter, verseStart || 1, edition);
      cards.classList.add("is-open");
      rail.classList.add("is-open");
    };
    band.appendChild(rail);
  });
  bindGlobal();
}
