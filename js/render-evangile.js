/**
 * DOM builders for gospel chapters/verses.
 * Verses injected via textContent only (XSS-safe).
 */

function applyLang(el, lang) {
  if (!lang) return;
  el.lang = lang;
  if (lang === "he" || lang === "ar") el.dir = "rtl";
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

function frameTitle(book) {
  return book?.original_title || book?.short || "";
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
  container._chapterWindow?.destroy();
  container._chapterWindow = null;
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
  const live = { editions, maps, chNums };

  function makeBand(n) {
    const editions = live.editions;
    const maps = live.maps;
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
      const label = alignedLabel(n, frameTitle(ed.book), ed.col, {
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

  const topSpacer = document.createElement("div");
  topSpacer.className = "chapter-spacer";
  topSpacer.dataset.edge = "top";
  const bottomSpacer = document.createElement("div");
  bottomSpacer.className = "chapter-spacer";
  bottomSpacer.dataset.edge = "bottom";
  stage.append(topSpacer, bottomSpacer);
  stage.dataset.window = "1";

  const state = {
    heights: new Map(),
    measured: new Set(),
    focus: priority != null && chNums.includes(priority) ? priority : null,
    jumped: !(priority != null && chNums.includes(priority)),
    probe: null,
    raf: 0,
    lock: 0,
    lastKey: "",
    destroyed: false,
    token,
    chNums: chNums.slice(),
    prefix: [],
    holdUntil: 0,
    holdTimer: 0,
  };

  function probeLine(text, lang, width) {
    const sizer = document.createElement("div");
    sizer.style.cssText =
      "position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;z-index:-1;";
    sizer.style.width = width || "38rem";
    const sample = document.createElement("div");
    sample.className = "verse-text";
    sample.style.whiteSpace = "nowrap";
    if (lang) sample.lang = lang;
    sample.textContent = text;
    sizer.append(sample);
    document.body.append(sizer);
    const lineH = parseFloat(getComputedStyle(sample).lineHeight);
    const count = [...text].length || 1;
    const charW = sample.scrollWidth / count;
    const inner = Math.max(80, sizer.clientWidth - 48);
    sizer.remove();
    return {
      lineH: Number.isFinite(lineH) && lineH > 0 ? lineH : 28,
      chars: charW > 0 ? Math.max(8, Math.floor(inner / charW)) : 42,
    };
  }

  function probeMetrics() {
    if (state.probe) return state.probe;
    const width =
      getComputedStyle(document.body).getPropertyValue("--edition-col").trim() ||
      "38rem";
    let latin = { lineH: 28, chars: 42 };
    try {
      latin = probeLine("abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz", "", width);
    } catch {
      /* keep fallback */
    }
    let heChars = latin.chars;
    let arChars = latin.chars;
    const langs = new Set(live.editions.map((ed) => ed.book?.version?.lang));
    if (langs.has("he")) {
      try {
        const got = probeLine(
          "אבגדהוזחטיכלמנסעפצקרשתאבגדהוזחטיכלמנסעפצקרשת",
          "he",
          width
        );
        heChars = got.chars;
        latin.lineH = Math.max(latin.lineH, got.lineH);
      } catch {
        /* keep fallback */
      }
    }
    if (langs.has("ar")) {
      try {
        const got = probeLine(
          "ابتثجحخدذرزسشصضطظعغفقكلمنهويابتثجحخدذرزسشصضطظعغفقكلمنهوي",
          "ar",
          width
        );
        arChars = got.chars;
        latin.lineH = Math.max(latin.lineH, got.lineH);
      } catch {
        /* keep fallback */
      }
    }
    state.probe = {
      lineH: latin.lineH || 28,
      chars: latin.chars || 42,
      heChars: heChars || 42,
      arChars: arChars || 42,
      head: 64,
      versePad: 10,
      bandGap: 16,
    };
    return state.probe;
  }

  function estimate(n) {
    if (state.heights.has(n)) return state.heights.get(n);
    const p = probeMetrics();
    const vSets = live.maps.map((m) => verseMap(m.get(n)));
    const nums = [...new Set(vSets.flatMap((m) => [...m.keys()]))];
    let lines = 0;
    for (const vn of nums) {
      let rowLines = 1;
      vSets.forEach((vm, i) => {
        const t = vm.get(vn)?.t || "";
        const lang = live.editions[i]?.book?.version?.lang;
        const c = lang === "he" ? p.heChars : lang === "ar" ? p.arChars : p.chars;
        rowLines = Math.max(rowLines, Math.ceil(t.length / Math.max(1, c)) || 1);
      });
      lines += rowLines;
    }
    const h = p.head + lines * (p.lineH + p.versePad) + p.bandGap;
    state.heights.set(n, h);
    return h;
  }

  function writeSpacers(firstIdx, lastIdx) {
    state.prefix = new Array(state.chNums.length);
    let before = 0;
    let after = 0;
    let acc = 0;
    for (let i = 0; i < state.chNums.length; i++) {
      state.prefix[i] = acc;
      const h = estimate(state.chNums[i]);
      acc += h;
      if (i < firstIdx) before += h;
      if (i > lastIdx) after += h;
    }
    topSpacer.style.height = `${Math.max(0, before)}px`;
    bottomSpacer.style.height = `${Math.max(0, after)}px`;
  }

  function mountedBands() {
    return [...stage.querySelectorAll(":scope > .chapter-band")];
  }

  function wantedRange() {
    const nums = state.chNums;
    if (!nums.length) return [0, -1];
    if (state.focus != null && !state.jumped) {
      let center = nums.indexOf(state.focus);
      if (center < 0) center = 0;
      const view = window.innerHeight * 2;
      let up = center;
      let down = center;
      let h = estimate(nums[center]);
      while (h < view && (up > 0 || down < nums.length - 1)) {
        if (down < nums.length - 1) {
          down += 1;
          h += estimate(nums[down]);
        }
        if (h >= view) break;
        if (up > 0) {
          up -= 1;
          h += estimate(nums[up]);
        }
      }
      return [up, down];
    }
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    const y0 = window.scrollY - stageTop - window.innerHeight;
    const y1 = window.scrollY - stageTop + 2 * window.innerHeight;
    const prefix = [];
    let acc = 0;
    for (const n of nums) {
      prefix.push(acc);
      acc += estimate(n);
    }
    let lo = 0;
    while (lo < nums.length - 1 && prefix[lo] + estimate(nums[lo]) < y0) lo += 1;
    let hi = nums.length - 1;
    while (hi > lo && prefix[hi] > y1) hi -= 1;
    return [Math.max(0, lo - 1), Math.min(nums.length - 1, hi + 1)];
  }

  function measureBand(band) {
    const n = +band.dataset.chapter;
    const mb = parseFloat(getComputedStyle(band).marginBottom) || 0;
    const h = band.offsetHeight + mb;
    const prev = state.heights.get(n);
    state.heights.set(n, h);
    state.measured.add(n);
    return prev == null || Math.abs(prev - h) > 1.5;
  }

  function dropBand(band) {
    const pair = band.querySelector(":scope > .chapter-pair");
    if (pair && container._parallelIO) {
      try {
        container._parallelIO.unobserve(pair);
      } catch {
        /* detached */
      }
    }
    band.remove();
  }

  let api = null;

  function syncWindow(opts = {}) {
    if (state.destroyed || container._renderToken !== state.token) return;
    if (!opts.force && performance.now() < state.holdUntil) return;
    const nums = state.chNums;
    const have = mountedBands();
    let snap = null;
    if (opts.anchor?.id) {
      const el = document.getElementById(opts.anchor.id);
      const band = el?.closest(".chapter-band");
      snap = {
        id: opts.anchor.id,
        view: opts.anchor.view,
        n: band ? +band.dataset.chapter : null,
      };
    } else {
      const chrome =
        document.querySelector(".reader-chrome") ||
        document.querySelector(".active-edition-bar") ||
        document.querySelector(".site-header");
      const line = (chrome ? chrome.getBoundingClientRect().bottom : 0) + 8;
      let snapView = -1e9;
      for (const el of stage.querySelectorAll(".chapter-label[id], .verse[id]")) {
        const view = el.getBoundingClientRect().top;
        if (view <= line && view > snapView) {
          const band = el.closest(".chapter-band");
          snap = { id: el.id, view, n: band ? +band.dataset.chapter : null };
          snapView = view;
        }
      }
      if (!snap && have[0]) {
        const label = have[0].querySelector(".chapter-label[id]");
        if (label) {
          snap = {
            id: label.id,
            view: label.getBoundingClientRect().top,
            n: +have[0].dataset.chapter,
          };
        }
      }
    }
    let [lo, hi] = wantedRange();
    if (snap) {
      const i = nums.indexOf(snap.n);
      if (i >= 0) {
        lo = Math.min(lo, i);
        hi = Math.max(hi, i);
      }
    }
    if (hi < lo) {
      writeSpacers(0, -1);
      state.lastKey = "empty";
      return;
    }
    const wantIds = nums.slice(lo, hi + 1).join(",");
    const mountedIds = have.map((b) => b.dataset.chapter).join(",");
    if (state.lastKey === `${lo}:${hi}` && mountedIds === wantIds) return;

    for (const band of have) {
      const i = nums.indexOf(+band.dataset.chapter);
      if (i < lo || i > hi) dropBand(band);
    }
    for (let i = lo; i <= hi; i++) {
      const n = nums[i];
      if (stage.querySelector(`:scope > .chapter-band[data-chapter="${n}"]`)) continue;
      const band = makeBand(n).band;
      let before = bottomSpacer;
      for (const b of mountedBands()) {
        if (+b.dataset.chapter > n) {
          before = b;
          break;
        }
      }
      stage.insertBefore(band, before);
    }

    const bands = mountedBands();
    const firstIdx = bands.length ? nums.indexOf(+bands[0].dataset.chapter) : 0;
    const lastIdx = bands.length ? nums.indexOf(+bands[bands.length - 1].dataset.chapter) : -1;
    writeSpacers(firstIdx < 0 ? 0 : firstIdx, lastIdx);
    let changed = false;
    for (const band of bands) {
      if (measureBand(band)) changed = true;
    }
    if (changed) writeSpacers(firstIdx < 0 ? 0 : firstIdx, lastIdx);
    if (opts.pin !== false && snap?.id) {
      const el = document.getElementById(snap.id);
      if (el) {
        const dy = el.getBoundingClientRect().top - snap.view;
        if (Math.abs(dy) > 1.5) {
          state.lock += 1;
          window.scrollBy(0, dy);
          state.lock -= 1;
        }
      }
    }
    state.lastKey = `${lo}:${hi}`;
    api?.onChange?.();
  }

  function onScroll() {
    if (state.lock || state.destroyed) return;
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      if (state.lock || state.destroyed) return;
      syncWindow();
    });
  }

  function onResize() {
    state.probe = null;
    state.lastKey = "";
    onScroll();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  document.fonts?.ready?.then(() => {
    if (state.destroyed) return;
    state.probe = null;
    state.lastKey = "";
    syncWindow();
  });

  api = {
    onChange: null,
    open() {
      syncWindow({ force: true });
      state.jumped = true;
      state.focus = null;
    },
    destroy() {
      state.destroyed = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (state.raf) cancelAnimationFrame(state.raf);
      clearTimeout(state.holdTimer);
      topSpacer.remove();
      bottomSpacer.remove();
      if (container._chapterWindow === api) container._chapterWindow = null;
    },
    ensure(chapter, verse) {
      const n = +chapter;
      if (!state.chNums.includes(n)) return null;
      state.focus = n;
      state.jumped = false;
      state.holdUntil = 0;
      syncWindow({ force: true, pin: false });
      state.jumped = true;
      state.focus = null;
      state.holdUntil = performance.now() + 1280;
      clearTimeout(state.holdTimer);
      state.holdTimer = setTimeout(() => {
        state.holdUntil = 0;
        syncWindow();
      }, 1320);
      const id = verse ? `c${n}v${verse}` : `c${n}`;
      return document.getElementById(id) || document.getElementById(`c${n}`);
    },
    docOffset(n) {
      const i = state.chNums.indexOf(+n);
      if (i < 0 || !state.prefix.length) return null;
      return stage.getBoundingClientRect().top + window.scrollY + (state.prefix[i] || 0);
    },
    retarget(nextEditions, nextMaps) {
      live.editions = nextEditions;
      live.maps = nextMaps;
      state.chNums = [...new Set(nextMaps.flatMap((m) => [...m.keys()]))].sort(
        (a, b) => a - b
      );
      live.chNums = state.chNums;
      state.probe = null;
      state.lastKey = "";
      state.token = container._renderToken;
    },
    remeasure(opts = {}) {
      state.probe = null;
      state.lastKey = "";
      state.token = container._renderToken;
      syncWindow({ force: true, pin: opts.pin !== false, anchor: opts.anchor || null });
    },
  };
  container._chapterWindow = api;
  api.open();

  let resolveReady;
  let resolveDone;
  const ready = new Promise((r) => {
    resolveReady = r;
  });
  const done = new Promise((r) => {
    resolveDone = r;
  });
  resolveReady();
  resolveDone();
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
  const win = container._chapterWindow;
  const windowed = !!(win && stage.dataset.window === "1");
  const chNums = [...new Set(maps.flatMap((m) => [...m.keys()]))].sort(
    (a, b) => a - b
  );
  const bands = [...stage.querySelectorAll(":scope > .chapter-band")];
  if (!windowed) {
    if (!chNums.length || bands.length !== chNums.length) return false;
    for (let i = 0; i < bands.length; i++) {
      if (+bands[i].dataset.chapter !== chNums[i]) return false;
    }
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

  const anchor = windowed ? readingAnchor(stage) : null;
  if (windowed) win.retarget(editions, maps);
  for (const band of bands) {
    const n = +band.dataset.chapter;
    const pair = band.querySelector(":scope > .chapter-pair");
    if (!pair) return false;
    rewritePair(pair, n, editions, maps);
  }
  if (windowed) win.remeasure({ anchor });
  return true;
}

function readingAnchor(stage) {
  const chrome =
    document.querySelector(".reader-chrome") ||
    document.querySelector(".active-edition-bar") ||
    document.querySelector(".site-header");
  const line = (chrome ? chrome.getBoundingClientRect().bottom : 0) + 8;
  let snap = null;
  let best = -1e9;
  for (const el of stage.querySelectorAll(".chapter-label[id], .verse[id]")) {
    const view = el.getBoundingClientRect().top;
    if (view <= line && view > best) {
      snap = { id: el.id, view };
      best = view;
    }
  }
  return snap;
}

function rewritePair(pair, n, editions, maps) {
  const parked = [
    ...pair.querySelectorAll(":scope > .parallel-rail, :scope > .parallel-cards"),
  ];
  for (const el of parked) el.remove();

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
      label = alignedLabel(n, frameTitle(ed.book), ed.col, {
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
    const title = frameTitle(ed.book);
    const numEl = label.querySelector(".chapter-num");
    if (numEl) numEl.textContent = title ? `${title} ${n}` : String(n);
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
  for (const el of parked) pair.append(el);
  for (const el of pool.values()) el.remove();
  pair._cite?.sync();
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
