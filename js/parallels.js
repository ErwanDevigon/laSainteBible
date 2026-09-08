/** Synopse NT + AT citations: rails on the main column only. */

import { resolveUrls, loadVersionIndex } from "./data-loader.js";
import { MaskDilatation } from "./expand.js";
import { BOOK_BY_ID, bookHref } from "./books.js";
import { displayBookTitle, parallelsEnabled } from "./editions.js";

const NT_URL = "data/parallels-nt.json";
const AT_URL = "data/citations-at.json";

let packed = null;
let indexCache = null;

async function loadJson(file) {
  for (const url of resolveUrls(file)) {
    const res = await fetch(url);
    if (res.ok) return res.json();
  }
  return null;
}

function invertCitations(items) {
  const out = [];
  for (const item of items) {
    for (const p of item.passages || []) {
      out.push({
        id: `rev-${item.id}-${p.book}`,
        kind: "accomplissement",
        origin: {
          book: p.book,
          short: p.short,
          spans: p.spans,
          cites: p.cites,
        },
        passages: item.origin ? [item.origin] : [],
        label: item.label,
      });
    }
  }
  return out;
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

function itemSpansOnBook(item, bookId) {
  const bags = [];
  if (item.origin?.book === bookId) bags.push(item.origin);
  for (const p of item.passages || []) {
    if (p.book === bookId) bags.push(p);
  }
  return bags.flatMap((p) => (p.spans || []).map((sp) => ({ passage: p, span: sp })));
}

function currentSpan(item, bookId, chapter, verse) {
  for (const hit of itemSpansOnBook(item, bookId)) {
    if (spanHasVerse(hit.span, chapter, verse)) return hit;
  }
  return null;
}

function othersOf(item, bookId, chapter, verse) {
  const cur = currentSpan(item, bookId, chapter, verse);
  const out = [];
  for (const p of item.passages || []) {
    const spans = (p.spans || []).filter((sp) => {
      if (!cur) return true;
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
  const tag = stampSuffix(item.kind);
  return refs ? `${refs} ${tag}` : tag;
}

function itemsForBookChapter(bookId, chapter) {
  const pack = packed;
  if (!pack) return [];
  const all = [...pack.synopse, ...pack.citations, ...pack.reverse];
  const out = [];
  for (const item of all) {
    for (const hit of itemSpansOnBook(item, bookId)) {
      if (hit.span.chapter === chapter) out.push({ item, ...hit });
    }
  }
  return out;
}

function verseEls(pair, col) {
  return [...pair.querySelectorAll(`.verse[data-col="${col}"]`)];
}

function rangeEls(pair, col, span) {
  const all = verseEls(pair, col);
  const v = spanVerses(span);
  return all.filter((el) => {
    const n = +el.dataset.verse;
    if (v.all) return true;
    if (v.set && v.set.size) return v.set.has(n) || (v.max >= 9000 && n >= v.min);
    return n >= v.min && n <= Math.min(v.max, 9000);
  });
}

function chromeTop() {
  const bar =
    document.querySelector(".edition-name-bar") ||
    document.querySelector(".book-title-bar") ||
    document.querySelector(".site-header");
  return bar ? bar.getBoundingClientRect().bottom : 0;
}

function lireBase() {
  return /\/lire(\/|$)/.test(window.location.pathname) ? "" : "lire/";
}

function versePhrase(span) {
  const ch = span.chapter;
  const ranges = span.ranges;
  if (!ranges || !ranges.length) return `chapitre ${ch}`;
  const bits = ranges.map((r) => {
    const a = r.start;
    const b = r.end;
    if (b == null || b >= 9000) return `versets ${a} et suivants`;
    if (a === b) return `verset ${a}`;
    return `versets ${a} à ${b}`;
  });
  return `chapitre ${ch}, ${bits.join(", ")}`;
}

function headingFor(bookId, span) {
  const fromIndex = indexCache?.books?.find((b) => b.id === bookId)?.title;
  const title = displayBookTitle(
    fromIndex || BOOK_BY_ID[bookId]?.title || bookId
  );
  return `${title}, ${versePhrase(span)}`;
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

function clearRails(container) {
  container.querySelectorAll(".parallel-rail, .parallel-layer").forEach((el) => el.remove());
  container.querySelectorAll(".parallel-cards").forEach((el) => {
    el.replaceChildren();
    el.classList.remove("is-open");
  });
}

function cardHost(edition, bookId, span) {
  const art = document.createElement("article");
  art.className = "parallel-card";
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
  const others = othersOf(item, bookId, chapter, verse);
  for (const p of others) {
    for (const sp of p.spans) {
      box.appendChild(cardHost(edition, p.book, sp));
    }
  }
}

function alignCards(cards, pair, col, span) {
  const els = rangeEls(pair, col, span);
  if (!els.length) return;
  const band = pair.closest(".chapter-band") || pair.parentElement;
  const bandTop = band.getBoundingClientRect().top;
  const braceTop = els[0].getBoundingClientRect().top;
  const viewTop = chromeTop();
  const target = Math.max(braceTop, viewTop);
  cards.style.marginTop = `${Math.max(0, target - bandTop)}px`;
  cards.dataset.synTop = String(target);
  cards.dataset.synScroll = String(window.scrollY);
}

function closeOpenCards(container) {
  container.querySelectorAll(".parallel-cards.is-open").forEach((el) => {
    el.querySelectorAll(".parallel-card").forEach((card) => {
      if (card._dil?.expanded) card._dil.collapse();
    });
    el.replaceChildren();
    el.classList.remove("is-open");
    el.style.marginTop = "";
  });
  container.querySelectorAll(".parallel-rail.is-open").forEach((el) => {
    el.classList.remove("is-open");
  });
}

function ensureCards(pair) {
  const band = pair.closest(".chapter-band") || pair.parentElement;
  let el = band.querySelector(":scope > .parallel-cards");
  if (el) return el;
  el = document.createElement("div");
  el.className = "parallel-cards";
  band.appendChild(el);
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

function paintRails(container, ctx) {
  clearRails(container);
  if (!parallelsEnabled()) return;
  const col = ctx.primaryCol;
  if (!col) return;
  const pairs = container.querySelectorAll(".chapter-pair");
  for (const pair of pairs) {
    const chapter = +pair.dataset.chapter;
    const hitsRaw = itemsForBookChapter(ctx.bookId, chapter);
    const hits = hitsRaw.map((h) => {
      const v = spanVerses(h.span);
      return { ...h, min: v.all ? 1 : v.min, max: v.all ? 999 : Math.min(v.max, 9000) };
    });
    assignLanes(hits);
    const sample = pair.querySelector(`.verse[data-col="${col}"]`);
    if (!sample) continue;
    const pr = pair.getBoundingClientRect();
    const colRight = sample.getBoundingClientRect().right - pr.left;
    for (const h of hits) {
      const els = rangeEls(pair, col, h.span);
      if (!els.length) continue;
      const first = els[0];
      const last = els[els.length - 1];
      const top = first.getBoundingClientRect().top - pr.top;
      const height = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
      const rail = document.createElement("button");
      rail.type = "button";
      rail.className = "parallel-rail";
      rail.style.top = `${top}px`;
      rail.style.height = `${Math.max(16, height)}px`;
      rail.style.left = `${colRight + 4 + h.lane * 6}px`;
      rail._item = h.item;
      rail._span = h.span;
      rail.setAttribute("aria-label", stampText(h.item, ctx.bookId, chapter, h.min));
      pair.appendChild(rail);
    }
  }
}

function bind(container, ctx) {
  let stamp = null;

  function ensureStamp() {
    if (stamp) return stamp;
    stamp = document.createElement("div");
    stamp.className = "parallel-stamp";
    stamp.hidden = true;
    document.body.appendChild(stamp);
    return stamp;
  }

  container.addEventListener("pointerover", (e) => {
    const rail = e.target.closest(".parallel-rail");
    if (!rail || !container.contains(rail)) return;
    const pair = rail.closest(".chapter-pair");
    const s = ensureStamp();
    s.textContent = stampText(
      rail._item,
      ctx.bookId,
      +pair.dataset.chapter,
      spanVerses(rail._span).min
    );
    s.hidden = false;
    const pr = pair.getBoundingClientRect();
    s.style.left = `${rail.getBoundingClientRect().right + 8}px`;
    s.style.top = `${e.clientY}px`;
    s.style.position = "fixed";
    s.style.transform = "translateY(-50%)";
  });

  container.addEventListener("pointermove", (e) => {
    const rail = e.target.closest(".parallel-rail");
    if (!rail || !stamp || stamp.hidden) return;
    stamp.style.top = `${e.clientY}px`;
  });

  container.addEventListener("pointerout", (e) => {
    const rail = e.target.closest(".parallel-rail");
    if (!rail) return;
    const to = e.relatedTarget;
    if (to && (rail.contains(to) || stamp?.contains(to))) return;
    if (stamp) stamp.hidden = true;
  });

  container.addEventListener("click", (e) => {
    const rail = e.target.closest(".parallel-rail");
    if (!rail || !container.contains(rail)) return;
    e.preventDefault();
    e.stopPropagation();
    if (stamp) stamp.hidden = true;
    openFromRail(rail, ctx);
  });
}

const ctx = { bookId: "", edition: "", primaryCol: "" };

export async function mountParallels({ bookId, container, editions }) {
  if (!container || !bookId) return;
  ctx.bookId = bookId;
  const primary = (editions || []).find((ed) => ed.primary) || (editions || []).at(-1);
  ctx.primaryCol = primary?.col || "";
  ctx.edition = primary?.book?.version?.id || primary?.col || "";
  await loadPack();
  try {
    indexCache = await loadVersionIndex(ctx.edition);
  } catch {
    indexCache = null;
  }
  paintRails(container, ctx);
  if (!container.dataset.parallelsBound) {
    container.dataset.parallelsBound = "1";
    bind(container, ctx);
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
  edition,
}) {
  if (!host || !bookId) return;
  await loadPack();
  const hitsRaw = itemsForBookChapter(bookId, chapter).filter((h) => {
    if (verseStart == null) return true;
    const v = spanVerses(h.span);
    if (v.all) return true;
    return spanHasVerse(h.span, chapter, verseStart);
  });
  if (!hitsRaw.length) return;
  const hits = hitsRaw.map((h) => {
    const v = spanVerses(h.span);
    return { ...h, min: v.all ? 1 : v.min, max: v.all ? 999 : Math.min(v.max, 9000) };
  });
  assignLanes(hits);
  host.style.position = "relative";
  hits.forEach((h) => {
    const rail = document.createElement("button");
    rail.type = "button";
    rail.className = "parallel-rail";
    rail.style.top = "0.4rem";
    rail.style.bottom = "0.4rem";
    rail.style.height = "auto";
    rail.style.right = `${-8 - h.lane * 6}px`;
    rail.style.left = "auto";
    rail._item = h.item;
    rail._span = h.span;
    host.appendChild(rail);
    rail.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeOpenCards(row?.parentElement || document);
      let cards = row?.querySelector(":scope > .parallel-cards");
      if (!cards && row) {
        cards = document.createElement("div");
        cards.className = "parallel-cards";
        row.appendChild(cards);
      }
      if (!cards) return;
      fillCards(cards, h.item, bookId, chapter, verseStart || 1, edition);
      cards.classList.add("is-open");
      rail.classList.add("is-open");
    });
  });
}
