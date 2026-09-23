/**
 * DOM builders for gospel chapters/verses.
 * Verses injected via textContent only (XSS-safe).
 */

function applyLang(el, lang) {
  if (!lang) return;
  el.lang = lang;
  if (lang === "he") el.dir = "rtl";
}

function verseRow(chapterN, verse, { highlight = false, idPrefix = "", col = null, withId = true, lang = "" } = {}) {
  const row = document.createElement("p");
  row.className = "verse";
  if (withId) row.id = `${idPrefix}c${chapterN}v${verse.n}`;
  row.dataset.verse = String(verse.n);
  if (col) row.dataset.col = col;
  if (highlight) row.dataset.highlight = "true";
  applyLang(row, lang);

  const vn = document.createElement("span");
  vn.className = "verse-num";
  vn.setAttribute("aria-hidden", "true");
  vn.textContent = String(verse.n);

  const vt = document.createElement("span");
  vt.className = "verse-text";
  vt.textContent = verse.t;

  row.appendChild(vn);
  row.appendChild(vt);
  return row;
}

/**
 * @param {object} chapter - { n, verses: [{n,t}] }
 * @param {{ highlightStart?: number, highlightEnd?: number, short?: string }} [opts]
 * @returns {HTMLElement}
 */
export function renderChapter(chapter, opts = {}) {
  const prefix = opts.idPrefix || "";
  const lang = opts.lang || "";
  const section = document.createElement("section");
  section.className = "chapter";
  section.id = `${prefix}c${chapter.n}`;
  section.dataset.chapter = String(chapter.n);
  applyLang(section, lang);

  const label = document.createElement("div");
  label.className = "chapter-label";
  applyLang(label, lang);
  const num = document.createElement("span");
  num.className = "chapter-num";
  const short = opts.short || "";
  num.textContent = short ? `${short} ${chapter.n}` : String(chapter.n);
  label.appendChild(num);
  section.appendChild(label);

  const hs = opts.highlightStart;
  const he = opts.highlightEnd;

  for (const verse of chapter.verses) {
    const highlight =
      hs != null && he != null && verse.n >= hs && verse.n <= he;
    section.appendChild(
      verseRow(chapter.n, verse, { highlight, idPrefix: prefix, lang })
    );
  }

  return section;
}

function citedSet(ranges) {
  const set = new Set();
  for (const r of ranges || []) {
    for (let n = r.start; n <= r.end; n++) set.add(n);
  }
  return set;
}

function maskZone(kind) {
  const wrap = document.createElement("div");
  wrap.className = `mask-zone mask-${kind}`;
  const inner = document.createElement("div");
  inner.className = "mask-zone-inner";
  wrap.appendChild(inner);
  return { wrap, inner };
}

function maskFold() {
  const el = document.createElement("div");
  el.className = "mask-fold";
  el.setAttribute("aria-hidden", "true");
  el.textContent = "···";
  return el;
}

/**
 * Chapter split: cited verse groups stay open; omitted runs live in mask zones.
 * @returns {{
 *   root: HTMLElement,
 *   excerpt: HTMLElement,
 *   label: HTMLElement,
 *   zones: { el: HTMLElement, kind: 'before'|'down' }[],
 * }}
 */
export function renderChapterMask(chapter, { short = "", verseStart, verseEnd, ranges = null, lang = "" } = {}) {
  const root = document.createElement("div");
  root.className = "chapter-mask";
  root.dataset.expanded = "false";
  root.dataset.chapter = String(chapter.n);
  applyLang(root, lang);

  const label = document.createElement("div");
  label.className = "chapter-label mask-label";
  applyLang(label, lang);
  const num = document.createElement("span");
  num.className = "chapter-num";
  num.textContent = short ? `${short} ${chapter.n}` : String(chapter.n);
  label.appendChild(num);

  const last = chapter.verses[chapter.verses.length - 1]?.n;
  let spans = Array.isArray(ranges) && ranges.length ? ranges : null;
  if (!spans) {
    const v1 = verseStart ?? 1;
    const v2 = verseEnd ?? (verseStart != null ? verseStart : last);
    spans = [{ start: v1, end: v2 }];
  }
  const cited = citedSet(spans);

  const segs = [];
  for (const verse of chapter.verses) {
    const isCited = cited.has(verse.n);
    const prev = segs[segs.length - 1];
    if (!prev || prev.cited !== isCited) segs.push({ cited: isCited, verses: [verse] });
    else prev.verses.push(verse);
  }

  const zones = [];
  let excerpt = null;
  let sawCited = false;

  const before = maskZone("before");
  before.inner.appendChild(label);
  if (segs[0] && !segs[0].cited) {
    for (const v of segs[0].verses) before.inner.appendChild(verseRow(chapter.n, v, { lang }));
    segs.shift();
  }
  root.appendChild(before.wrap);
  zones.push({ el: before.wrap, kind: "before" });

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.cited) {
      const block = document.createElement("div");
      block.className = "mask-excerpt";
      for (const v of seg.verses) {
        block.appendChild(verseRow(chapter.n, v, { highlight: true, lang }));
      }
      if (!excerpt) excerpt = block;
      root.appendChild(block);
      sawCited = true;
      continue;
    }
    if (i < segs.length - 1 && sawCited) {
      root.appendChild(maskFold());
    }
    const gap = maskZone(i === segs.length - 1 ? "after" : "gap");
    for (const v of seg.verses) gap.inner.appendChild(verseRow(chapter.n, v, { lang }));
    root.appendChild(gap.wrap);
    zones.push({ el: gap.wrap, kind: "down" });
  }

  if (!excerpt) {
    excerpt = document.createElement("div");
    excerpt.className = "mask-excerpt";
    root.appendChild(excerpt);
  }

  return { root, excerpt, label, zones };
}

/**
 * Render full book into container (all chapters at once).
 */
export function renderBook(book, container, opts = {}) {
  container.replaceChildren();
  container.classList.add("book-body");

  const prefix = opts.idPrefix || "";
  const frag = document.createDocumentFragment();
  for (const chapter of book.chapters) {
    frag.appendChild(
      renderChapter(chapter, { short: book.short, idPrefix: prefix })
    );
  }
  container.appendChild(frag);

  if (opts.chapter) {
    scrollToRef(container, opts.chapter, opts.verse, {
      behavior: opts.behavior || "auto",
    });
  }
}

function chapterMap(book) {
  const map = new Map();
  for (const ch of book.chapters || []) map.set(ch.n, ch);
  return map;
}

function verseMap(chapter) {
  const map = new Map();
  for (const v of chapter?.verses || []) map.set(v.n, v);
  return map;
}

function alignedLabel(n, short, col, { id = "", primary = false, lang = "" } = {}) {
  const label = document.createElement("div");
  label.className = "chapter-label";
  label.dataset.col = col;
  if (id) label.id = id;
  if (primary) label.dataset.chapter = String(n);
  applyLang(label, lang);
  const num = document.createElement("span");
  num.className = "chapter-num";
  num.textContent = short ? `${short} ${n}` : String(n);
  label.appendChild(num);
  return label;
}

/**
 * Same-page editions: one CSS row per verse so numbers share a Y.
 * `editions` is left-to-right; the last one is the rest (primary) column.
 *
 * @param {{
 *   editions: { book: object, col: string, label?: string, primary?: boolean }[],
 *   container: HTMLElement,
 *   end?: HTMLElement|null,
 * }} opts
 */
/**
 * One row per verse (small grid) instead of one grid for the whole chapter.
 * Chapters through `priority` are inserted immediately; the rest yields per frame.
 * @returns {{ ready: Promise<void>, done: Promise<void>, token: object }}
 */
export function renderAlignedBook({ editions, container, end = null, priority = null }) {
  container._parallelSeq = (container._parallelSeq || 0) + 1;
  container._parallelIO?.disconnect();
  container._parallelIO = null;
  container._parallelMO?.disconnect();
  container._parallelMO = null;
  const token = {};
  container._renderToken = token;
  container.replaceChildren();
  container.classList.add("book-body", "is-aligned");

  const stage = document.createElement("div");
  stage.className = "edition-stage";
  stage.style.setProperty("--edition-count", String(editions.length));
  container.appendChild(stage);

  const maps = editions.map((ed) => chapterMap(ed.book));
  const chNums = [...new Set(maps.flatMap((m) => [...m.keys()]))].sort(
    (a, b) => a - b
  );

  function makeBand(n) {
    const pair = document.createElement("section");
    pair.className = "chapter-pair";
    pair.dataset.chapter = String(n);

    const vMaps = editions.map((_, i) => verseMap(maps[i].get(n)));
    const vNums = [...new Set(vMaps.flatMap((m) => [...m.keys()]))].sort(
      (a, b) => a - b
    );

    const head = document.createElement("div");
    head.className = "verse-line";
    editions.forEach((ed) => {
      const lang = ed.book.version?.lang || "";
      const label = alignedLabel(n, ed.book.short, ed.col, {
        id: ed.primary ? `c${n}` : "",
        primary: !!ed.primary,
        lang,
      });
      label.classList.add("is-card-head");
      label.dataset.edition = ed.book.version?.id || "";
      if (!vNums.length) label.classList.add("is-card-foot");
      head.append(label);
    });
    pair.append(head);

    for (let vi = 0; vi < vNums.length; vi++) {
      const vn = vNums[vi];
      const line = document.createElement("div");
      line.className = "verse-line";
      const last = vi === vNums.length - 1;
      editions.forEach((ed, i) => {
        const lang = ed.book.version?.lang || "";
        const v = vMaps[i].get(vn) || { n: vn, t: "" };
        const row = verseRow(n, v, { col: ed.col, withId: !!ed.primary, lang });
        row.dataset.edition = ed.book.version?.id || "";
        if (last) row.classList.add("is-card-foot");
        line.append(row);
      });
      pair.append(line);
    }

    const band = document.createElement("div");
    band.className = "chapter-band";
    band.dataset.chapter = String(n);
    band.append(pair);
    return { band, verseCount: vNums.length * editions.length };
  }

  function appendEnd() {
    if (!end) return;
    for (const ed of editions) {
      if (ed.primary) {
        end.dataset.col = ed.col;
        stage.append(end);
      } else {
        const hole = document.createElement("div");
        hole.className = "book-end";
        hole.dataset.col = ed.col;
        hole.setAttribute("aria-hidden", "true");
        stage.append(hole);
      }
    }
  }

  let resolveReady;
  let resolveDone;
  const ready = new Promise((r) => {
    resolveReady = r;
  });
  const done = new Promise((r) => {
    resolveDone = r;
  });
  let readySent = false;
  function markReady() {
    if (readySent) return;
    readySent = true;
    resolveReady();
  }

  let cursor = 0;
  function takeThrough(index) {
    const frag = document.createDocumentFragment();
    while (cursor < chNums.length && cursor <= index) {
      frag.appendChild(makeBand(chNums[cursor]).band);
      cursor += 1;
    }
    if (frag.childNodes.length) stage.appendChild(frag);
  }

  const priIndex = priority == null ? 0 : chNums.indexOf(priority);
  if (chNums.length) takeThrough(priIndex < 0 ? 0 : priIndex);
  markReady();

  const VERSE_BUDGET = 400;

  function step() {
    if (container._renderToken !== token) return;
    if (cursor >= chNums.length) {
      appendEnd();
      resolveDone();
      return;
    }
    const frag = document.createDocumentFragment();
    let verses = 0;
    while (cursor < chNums.length && verses < VERSE_BUDGET) {
      const made = makeBand(chNums[cursor]);
      cursor += 1;
      verses += made.verseCount;
      frag.appendChild(made.band);
    }
    stage.appendChild(frag);
    if (cursor >= chNums.length) {
      appendEnd();
      resolveDone();
      return;
    }
    requestAnimationFrame(step);
  }

  if (cursor < chNums.length) requestAnimationFrame(step);
  else {
    appendEnd();
    resolveDone();
  }

  return { ready, done, token };
}

/**
 * Insert, drop, or replace one column inside an already built book.
 * Returns false when the chapter set is still incomplete — caller rebuilds.
 */
export function patchAlignedBook({ editions, container, prevIds = [] }) {
  const stage = container.querySelector(".edition-stage");
  if (!stage || !editions?.length) return false;
  const maps = editions.map((ed) => chapterMap(ed.book));
  const chNums = [...new Set(maps.flatMap((m) => [...m.keys()]))].sort(
    (a, b) => a - b
  );
  const bands = [...stage.querySelectorAll(":scope > .chapter-band")];
  if (!chNums.length || bands.length !== chNums.length) return false;
  for (let i = 0; i < bands.length; i++) {
    if (+bands[i].dataset.chapter !== chNums[i]) return false;
  }

  if (prevIds.length) {
    for (const line of stage.querySelectorAll(".chapter-pair > .verse-line")) {
      const kids = [...line.children];
      kids.forEach((el, i) => {
        if (!el.dataset.edition && prevIds[i]) el.dataset.edition = prevIds[i];
      });
    }
  }

  container._parallelSeq = (container._parallelSeq || 0) + 1;
  container._parallelIO?.disconnect();
  container._parallelIO = null;
  container._parallelMO?.disconnect();
  container._parallelMO = null;
  const token = {};
  container._renderToken = token;
  stage.style.setProperty("--edition-count", String(editions.length));

  for (const band of bands) {
    const n = +band.dataset.chapter;
    const pair = band.querySelector(":scope > .chapter-pair");
    if (!pair) return false;
    rewritePair(pair, n, editions, maps);
  }
  return true;
}

function rewritePair(pair, n, editions, maps) {
  pair.querySelectorAll(":scope > .parallel-rail, :scope > .parallel-cards").forEach((el) => {
    el.remove();
  });
  delete pair._cite;

  const pool = new Map();
  const oldLines = [...pair.querySelectorAll(":scope > .verse-line")];
  for (const line of oldLines) {
    for (const el of [...line.children]) {
      const edId = el.dataset.edition;
      if (!edId) continue;
      const key = el.classList.contains("chapter-label")
        ? `${edId}:h`
        : `${edId}:${el.dataset.verse}`;
      if (!pool.has(key)) pool.set(key, el);
    }
  }

  const vMaps = editions.map((_, i) => verseMap(maps[i].get(n)));
  const vNums = [...new Set(vMaps.flatMap((m) => [...m.keys()]))].sort(
    (a, b) => a - b
  );

  function claim(edId, verse) {
    const key = verse == null ? `${edId}:h` : `${edId}:${verse}`;
    const el = pool.get(key);
    if (!el) return null;
    pool.delete(key);
    return el;
  }

  const head = document.createElement("div");
  head.className = "verse-line";
  for (const ed of editions) {
    const edId = ed.book.version?.id || "";
    const lang = ed.book.version?.lang || "";
    let label = claim(edId, null);
    if (!label) {
      label = alignedLabel(n, ed.book.short, ed.col, {
        id: ed.primary ? `c${n}` : "",
        primary: !!ed.primary,
        lang,
      });
      label.classList.add("is-card-head");
    }
    label.dataset.col = ed.col;
    label.dataset.edition = edId;
    label.classList.add("is-card-head");
    label.classList.toggle("is-card-foot", vNums.length === 0);
    if (ed.primary) label.id = `c${n}`;
    else label.removeAttribute("id");
    applyLang(label, lang);
    head.append(label);
  }

  const fresh = [head];
  vNums.forEach((vn, vi) => {
    const line = document.createElement("div");
    line.className = "verse-line";
    const last = vi === vNums.length - 1;
    editions.forEach((ed, i) => {
      const edId = ed.book.version?.id || "";
      const lang = ed.book.version?.lang || "";
      let row = claim(edId, String(vn));
      if (!row) {
        const v = vMaps[i].get(vn) || { n: vn, t: "" };
        row = verseRow(n, v, { col: ed.col, withId: !!ed.primary, lang });
      }
      row.dataset.col = ed.col;
      row.dataset.edition = edId;
      row.dataset.verse = String(vn);
      row.classList.toggle("is-card-foot", last);
      if (ed.primary) row.id = `c${n}v${vn}`;
      else row.removeAttribute("id");
      applyLang(row, lang);
      line.append(row);
    });
    fresh.push(line);
  });

  for (const line of oldLines) line.remove();
  for (const line of fresh) pair.append(line);
  for (const el of pool.values()) el.remove();
}

export function renderSingleChapter(book, chapterN, container, range = null) {
  container.replaceChildren();
  container.classList.add("book-body");
  const ch = book.chapters.find((c) => c.n === chapterN);
  if (!ch) {
    const p = document.createElement("p");
    p.className = "status-msg";
    p.textContent = `Chapitre ${chapterN} introuvable.`;
    container.appendChild(p);
    return;
  }
  const opts = range
    ? { highlightStart: range.start, highlightEnd: range.end, short: book.short }
    : { short: book.short };
  container.appendChild(renderChapter(ch, opts));
}

export function excerptText(book, chapterN, vStart, vEnd, maxVerses = 4) {
  const ch = book.chapters.find((c) => c.n === chapterN);
  if (!ch) return "";
  const start = vStart || 1;
  const end = vEnd || start;
  const verses = ch.verses.filter((v) => v.n >= start && v.n <= end);
  const slice = verses.slice(0, maxVerses);
  let text = slice.map((v) => v.t).join(" ");
  if (verses.length > maxVerses) text += "…";
  return text;
}

export function formatRef(short, chapter, vStart, vEnd) {
  if (vStart && vEnd && vStart !== vEnd) {
    return `${short} ${chapter}, ${vStart}-${vEnd}`;
  }
  if (vStart) return `${short} ${chapter}, ${vStart}`;
  return `${short} ${chapter}`;
}

/**
 * @param {ParentNode|null} root
 * @param {number} chapter
 * @param {number|null} [verse]
 * @param {{ behavior?: ScrollBehavior }} [opts]
 */
export function scrollToRef(root, chapter, verse, opts = {}) {
  const scope = root || document;
  let el = null;
  if (verse) {
    el =
      scope.querySelector(`#c${chapter}v${verse}`) ||
      document.getElementById(`c${chapter}v${verse}`);
  }
  if (!el) {
    el =
      scope.querySelector(`#c${chapter}`) ||
      document.getElementById(`c${chapter}`);
  }
  if (!el) return false;

  const behavior = opts.behavior ?? "smooth";
  // Instant jump after full layout — avoid smooth race on first paint
  el.scrollIntoView({ block: "start", behavior });
  return true;
}

/** Parse location hash like #c12 or #c12v3 */
export function parseHash(hash = window.location.hash) {
  const m = /^#c(\d+)(?:v(\d+))?$/i.exec(hash || "");
  if (!m) return null;
  return {
    chapter: parseInt(m[1], 10),
    verse: m[2] ? parseInt(m[2], 10) : null,
  };
}
