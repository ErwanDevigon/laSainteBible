/** Synopse NT + AT citations: brace, stamp, parallel cards. */

import { resolveUrls } from "./data-loader.js";
import { MaskDilatation } from "./expand.js";

const NT_URL = "data/parallels-nt.json";
const AT_URL = "data/citations-at.json";

let packed = null;

async function loadJson(file) {
  for (const url of resolveUrls(file)) {
    const res = await fetch(url);
    if (res.ok) return res.json();
  }
  return null;
}

async function loadPack() {
  if (packed) return packed;
  const [nt, at] = await Promise.all([loadJson(NT_URL), loadJson(AT_URL)]);
  packed = {
    synopse: nt?.items || [],
    citations: at?.items || [],
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

function currentSpan(item, bookId, chapter, verse) {
  const bags = [];
  if (item.origin?.book === bookId) bags.push(item.origin);
  for (const p of item.passages || []) {
    if (p.book === bookId) bags.push(p);
  }
  for (const p of bags) {
    for (const sp of p.spans || []) {
      if (spanHasVerse(sp, chapter, verse)) return { passage: p, span: sp };
    }
  }
  return null;
}

function othersOf(item, bookId, chapter, verse) {
  const cur = currentSpan(item, bookId, chapter, verse);
  const out = [];
  for (const p of item.passages || []) {
    const spans = (p.spans || []).filter((sp) => {
      if (!cur) return true;
      return !(p.book === bookId && sp.chapter === cur.span.chapter &&
        JSON.stringify(sp.ranges) === JSON.stringify(cur.span.ranges));
    });
    if (!spans.length) continue;
    out.push({
      ...p,
      spans,
      cites: spans.map((s, i) => p.cites?.[i] || citeOf(s)),
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

function stampText(item, bookId, chapter, verse) {
  const others = othersOf(item, bookId, chapter, verse);
  const refs = formatPassages(others);
  if (item.kind === "synopse") {
    return refs ? `${item.label}: ${refs}` : item.label;
  }
  return refs || item.label;
}

function hitsFor(pack, bookId, chapter, verse) {
  const syn = [];
  for (const item of pack.synopse) {
    if (currentSpan(item, bookId, chapter, verse)) syn.push(item);
  }
  const at = [];
  for (const item of pack.citations) {
    if (currentSpan(item, bookId, chapter, verse)) at.push(item);
  }
  syn.sort((a, b) => spanSize(a, bookId, chapter, verse) - spanSize(b, bookId, chapter, verse));
  return { syn: syn[0] || null, at: at[0] || null };
}

function spanSize(item, bookId, chapter, verse) {
  const cur = currentSpan(item, bookId, chapter, verse);
  if (!cur) return 1e9;
  const v = spanVerses(cur.span);
  if (v.all) return 1000;
  return (v.max || 0) - (v.min || 0);
}

function verseEls(pair, col) {
  return [...pair.querySelectorAll(`.verse[data-col="${col}"]`)];
}

function rangeEls(pair, col, span) {
  const all = verseEls(pair, col);
  const v = spanVerses(span);
  const picked = all.filter((el) => {
    const n = +el.dataset.verse;
    if (v.all) return true;
    if (v.set && v.set.size) return v.set.has(n) || (v.max >= 9000 && n >= v.min);
    return n >= v.min && n <= Math.min(v.max, 9000);
  });
  return picked;
}

function placeLayer(layer, pair, col, span) {
  const els = rangeEls(pair, col, span);
  if (!els.length) return false;
  const first = els[0];
  const last = els[els.length - 1];
  const pr = pair.getBoundingClientRect();
  const fr = first.getBoundingClientRect();
  const lr = last.getBoundingClientRect();
  const g = {
    top: fr.top - pr.top,
    height: Math.max(24, lr.bottom - fr.top),
    left: fr.right - pr.left,
    mid: fr.top - pr.top + Math.max(24, lr.bottom - fr.top) / 2,
  };
  layer._geom = g;
  const brace = layer.querySelector(".parallel-brace");
  const stamp = layer.querySelector(".parallel-stamp:not(.parallel-stamp-at)");
  const extra = layer.querySelector(".parallel-stamp-at");
  if (brace) {
    brace.style.top = `${g.top}px`;
    brace.style.height = `${g.height}px`;
    brace.style.left = `${g.left}px`;
  }
  if (stamp) {
    stamp.style.top = `${g.mid}px`;
    stamp.style.left = `${g.left + 14}px`;
  }
  if (extra) {
    extra.style.top = `${g.mid + 28}px`;
    extra.style.left = `${g.left + 14}px`;
  }
  const band = pair.parentElement;
  const cards = band?.querySelector(":scope > .parallel-cards");
  if (cards) cards.style.marginTop = `${g.top}px`;
  return true;
}

function svgBrace() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 12 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("parallel-brace-svg");
  const path = document.createElementNS(ns, "path");
  path.setAttribute(
    "d",
    "M1 0 C10 0 10 46 6 50 C10 54 10 100 1 100"
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.6");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path);
  return svg;
}

function clearLayer(layer) {
  layer.replaceChildren();
  layer.classList.remove("is-on", "is-open");
  layer.hidden = true;
}

function cardHost(edition, bookId, span, short) {
  const art = document.createElement("article");
  art.className = "parallel-card";
  const head = document.createElement("header");
  head.className = "parallel-card-head";
  head.textContent = `${short} ${citeOf(span)}`;
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
  });
  dil.whenReady().catch(() => {
    body.textContent = "Passage indisponible.";
  });
  return art;
}

function fillCards(box, item, bookId, chapter, verse, edition) {
  box.replaceChildren();
  const others = othersOf(item, bookId, chapter, verse);
  for (const p of others) {
    for (const sp of p.spans) {
      box.appendChild(cardHost(edition, p.book, sp, p.short));
    }
  }
}

function bind(container, ctx) {
  let layer = null;
  let cardsEl = null;
  let shown = null;
  let open = false;

  function ensureLayer(pair) {
    let el = pair.querySelector(":scope > .parallel-layer");
    if (el) return el;
    el = document.createElement("div");
    el.className = "parallel-layer";
    el.hidden = true;
    pair.appendChild(el);
    return el;
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

  function hide() {
    if (open) return;
    if (layer) clearLayer(layer);
    if (cardsEl) {
      cardsEl.replaceChildren();
      cardsEl.classList.remove("is-open");
      cardsEl.style.marginTop = "";
    }
    shown = null;
    layer = null;
    cardsEl = null;
  }

  function show(pair, col, chapter, verse) {
    const pack = packed;
    if (!pack) return;
    const bookId = ctx.bookId;
    const hit = hitsFor(pack, bookId, +chapter, +verse);
    const item = hit.syn || hit.at;
    if (!item) {
      hide();
      return;
    }
    const cur = currentSpan(item, bookId, +chapter, +verse);
    if (!cur) {
      hide();
      return;
    }
    const key = `${col}:${item.id}:${cur.span.chapter}`;
    if (shown === key && layer && !layer.hidden) return;
    if (open) return;

    layer = ensureLayer(pair);
    cardsEl = ensureCards(pair);
    clearLayer(layer);
    cardsEl.replaceChildren();
    cardsEl.classList.remove("is-open");

    const brace = document.createElement("div");
    brace.className = "parallel-brace";
    brace.appendChild(svgBrace());

    const stamp = document.createElement("button");
    stamp.type = "button";
    stamp.className = "parallel-stamp";
    stamp.textContent = stampText(item, bookId, +chapter, +verse);

    if (hit.syn && hit.at) {
      const extra = document.createElement("button");
      extra.type = "button";
      extra.className = "parallel-stamp parallel-stamp-at";
      extra.textContent = stampText(hit.at, bookId, +chapter, +verse);
      extra.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openItem(hit.at, bookId, +chapter, +verse, col);
      });
      layer.append(brace, stamp, extra);
    } else {
      layer.append(brace, stamp);
    }

    stamp.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openItem(item, bookId, +chapter, +verse, col);
    });

    if (!placeLayer(layer, pair, col, cur.span)) {
      clearLayer(layer);
      return;
    }

    layer.hidden = false;
    requestAnimationFrame(() => layer.classList.add("is-on"));
    shown = key;
  }

  function openItem(item, bookId, chapter, verse, col) {
    if (!cardsEl || !layer) return;
    const edition = ctx.colToEdition.get(col) || ctx.edition;
    fillCards(cardsEl, item, bookId, chapter, verse, edition);
    cardsEl.classList.add("is-open");
    layer.classList.add("is-open");
    open = true;
  }

  container.addEventListener("pointerover", (e) => {
    const verse = e.target.closest(".chapter-pair > .verse");
    if (!verse || !container.contains(verse)) return;
    if (verse.closest(".parallel-layer")) return;
    const pair = verse.closest(".chapter-pair");
    if (!pair) return;
    show(pair, verse.dataset.col, pair.dataset.chapter, verse.dataset.verse);
  });

  container.addEventListener("pointerleave", (e) => {
    const to = e.relatedTarget;
    if (to && (container.contains(to) || to.closest?.(".parallel-layer, .parallel-cards"))) {
      return;
    }
    hide();
  });

  document.addEventListener("pointerdown", (e) => {
    if (!open || !layer) return;
    if (layer.contains(e.target) || cardsEl?.contains(e.target)) return;
    open = false;
    hide();
  });
}

const ctx = { bookId: "", edition: "", colToEdition: new Map() };

export async function mountParallels({ bookId, container, editions }) {
  if (!container || !bookId) return;
  ctx.bookId = bookId;
  ctx.colToEdition = new Map();
  for (const ed of editions || []) {
    const id = ed.book?.version?.id || ed.col;
    ctx.colToEdition.set(ed.col, id);
    if (ed.primary) ctx.edition = id;
  }
  await loadPack();
  if (!container.dataset.parallelsBound) {
    container.dataset.parallelsBound = "1";
    bind(container, ctx);
  }
}
