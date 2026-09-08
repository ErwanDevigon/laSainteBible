import { tryLoadBook, getChapter } from "./data-loader.js";
import { renderChapterMask } from "./render-evangile.js";
import { getActiveEdition, DEFAULT_ACTIVE } from "./editions.js";

/**
 * Solve CSS cubic-bezier(x1,y1,x2,y2) for progress in [0,1].
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {(t: number) => number}
 */
function unitBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const z = sampleX(t) - x;
      if (Math.abs(z) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= z / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const sx = sampleX(t);
      if (Math.abs(sx - x) < 1e-6) return t;
      if (x > sx) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveX(x));
  };
}

function easeFromCss() {
  const style = getComputedStyle(document.documentElement);
  const raw =
    style.getPropertyValue("--mask-ease").trim() ||
    style.getPropertyValue("--ease").trim();
  const m = raw.match(
    /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/
  );
  if (!m) return (t) => t;
  return unitBezier(+m[1], +m[2], +m[3], +m[4]);
}

const EDGE_SLACK = 8;

/**
 * In-place mask dilatation.
 * Visible overflow edge animates; once it leaves the viewport the rest snaps.
 * Collapse glides scroll back to the saved start.
 */
export class MaskDilatation {
  /**
   * @param {HTMLElement} host
   * @param {{ bookId: string, chapter: number, verseStart?: number|null, verseEnd?: number|null, edition?: string, fallback?: string }} ref
   */
  constructor(host, ref) {
    this.host = host;
    this.ref = { ...ref };
    this.expanded = false;
    this.savedScrollY = 0;
    this.root = null;
    this.excerpt = null;
    /** @type {{ el: HTMLElement, kind: 'before'|'down', height: number }[]} */
    this.zones = [];
    this._fracPin = 0;
    this._pinRaf = 0;
    this._scrollRaf = 0;
    this._onClick = this._onClick.bind(this);
    this._moved = false;
    this._down = null;
    this._ready = this._mount();
  }

  async _mount() {
    const edition = this.ref.edition || getActiveEdition() || DEFAULT_ACTIVE;
    this.ref.edition = edition;
    const book = await tryLoadBook(this.ref.bookId, edition);
    if (!book) throw new Error("Livre introuvable");
    const ch =
      getChapter(book, this.ref.chapter) ||
      (this.ref.altChapter ? getChapter(book, this.ref.altChapter) : null);
    if (!ch) throw new Error("Chapitre introuvable");

    const last = ch.verses[ch.verses.length - 1]?.n;
    const verseStart = this.ref.verseStart ?? 1;
    const verseEnd = this.ref.verseEnd ?? last;
    const ranges = this.ref.ranges?.length
      ? this.ref.ranges
      : [{ start: verseStart, end: verseEnd }];

    const { root, excerpt, zones } = renderChapterMask(ch, {
      short: book.short,
      verseStart,
      verseEnd,
      ranges,
    });

    this.root = root;
    this.excerpt = excerpt;
    this.zones = zones.map((z) => ({ ...z, height: 0 }));
    this.host.replaceChildren(root);

    root.addEventListener("pointerdown", (e) => {
      this._down = { x: e.clientX, y: e.clientY };
      this._moved = false;
    });
    root.addEventListener("pointermove", (e) => {
      if (!this._down) return;
      if (
        Math.abs(e.clientX - this._down.x) > 8 ||
        Math.abs(e.clientY - this._down.y) > 8
      ) {
        this._moved = true;
      }
    });
    root.addEventListener("click", this._onClick);

    this._measureHeights();

    return book;
  }

  /**
   * Reload chapter text for a new edition. Keeps expanded state if possible.
   * @param {string} edition
   */
  async remount(edition) {
    const was = this.expanded;
    if (was) this.collapse();
    this.ref.edition = edition;
    this.expanded = false;
    try {
      await this._mount();
      if (was) this.expand();
    } catch (err) {
      const text = this.ref.fallback || "Passage indisponible.";
      const p = document.createElement("div");
      p.className = "reading-excerpt";
      p.textContent = text;
      this.host.replaceChildren(p);
      this.root = null;
      throw err;
    }
  }

  _measureHeights() {
    for (const z of this.zones) {
      const inner = z.el.querySelector(".mask-zone-inner");
      z.height = inner ? inner.scrollHeight : 0;
    }
  }

  whenReady() {
    return this._ready;
  }

  _onClick(e) {
    if (e.target.closest("a, button, select")) return;
    if (this._moved) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return;
    this.toggle();
  }

  toggle() {
    if (this.expanded) this.collapse();
    else this.expand();
  }

  _viewportClip() {
    const bar =
      document.querySelector(".active-edition-bar") ||
      document.querySelector(".edition-name-bar") ||
      document.querySelector(".book-title-bar") ||
      document.querySelector(".site-header");
    const top = bar ? bar.getBoundingClientRect().bottom : 0;
    return { top, bottom: window.innerHeight };
  }

  /** Room a zone can grow before its overflow edge leaves the viewport. */
  _roomFor(zone) {
    const clip = this._viewportClip();
    const r = zone.el.getBoundingClientRect();
    if (zone.kind === "before") {
      const er = this.excerpt.getBoundingClientRect();
      return Math.max(0, er.top - clip.top);
    }
    return Math.max(0, clip.bottom - r.top);
  }

  /**
   * @param {HTMLElement|null} zone
   * @param {number} px
   * @param {boolean} instant
   */
  _setHeight(zone, px, instant) {
    if (!zone) return;
    if (instant) zone.classList.add("is-frozen");
    zone.style.setProperty("--mask-height", `${Math.max(0, px)}px`);
    if (instant) {
      void zone.offsetHeight;
      zone.classList.remove("is-frozen");
    }
  }

  /**
   * Keep excerpt visually pinned. Integer part → scrollY.
   * Remainder → translate on the host (avoids 1px scroll snap tremble).
   */
  _pinOnce(targetTop) {
    if (!this.excerpt) return;
    if (document.body.classList.contains("is-swiping")) return;
    const err = this.excerpt.getBoundingClientRect().top - targetTop;
    if (err === 0) return;

    let translate = (this._fracPin || 0) - err;
    let scrollAdj = 0;
    if (translate <= -1 || translate >= 1) {
      scrollAdj = -Math.trunc(translate);
      translate += scrollAdj;
    }
    if (scrollAdj) window.scrollTo(0, window.scrollY + scrollAdj);
    this._fracPin = translate;
    this.host.style.transform = translate
      ? `translate3d(0, ${translate}px, 0)`
      : "";
  }

  _clearFracPin() {
    if (!this._fracPin) {
      this.host.style.transform = "";
      return;
    }
    window.scrollTo(0, window.scrollY - this._fracPin);
    this._fracPin = 0;
    this.host.style.transform = "";
  }

  /**
   * Pin excerpt + snap a zone the moment its overflow edge leaves the viewport.
   * @param {number} targetTop
   * @param {number} durationMs
   */
  _driveExpand(targetTop, durationMs) {
    this._stopPin();
    const excerpt = this.excerpt;
    if (!excerpt) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      for (const z of this.zones) this._setHeight(z.el, z.height, true);
      this._pinOnce(targetTop);
      return;
    }

    const open = this.zones.map((z) => z.height <= 0);

    const t0 = performance.now();
    const tick = (now) => {
      this._pinOnce(targetTop);
      const clip = this._viewportClip();

      this.zones.forEach((z, i) => {
        if (open[i]) return;
        const r = z.el.getBoundingClientRect();
        const hit =
          z.kind === "before"
            ? r.top <= clip.top + 0.5
            : r.bottom >= clip.bottom - 0.5;
        if (!hit) return;
        this._setHeight(z.el, z.height, true);
        if (z.kind === "before") this._pinOnce(targetTop);
        open[i] = true;
      });

      if (open.some((v) => !v) && now - t0 < durationMs + 48) {
        this._pinRaf = requestAnimationFrame(tick);
      } else {
        this.zones.forEach((z, i) => {
          if (!open[i]) this._setHeight(z.el, z.height, true);
        });
        this._pinOnce(targetTop);
        this._clearFracPin();
        this._pinOnce(targetTop);
        this._pinRaf = 0;
      }
    };
    this._pinRaf = requestAnimationFrame(tick);
  }

  _stopPin() {
    if (this._pinRaf) {
      cancelAnimationFrame(this._pinRaf);
      this._pinRaf = 0;
    }
  }

  /**
   * Ease window.scrollY from `fromY` to `toY` with --mask-ease.
   * @param {number} fromY
   * @param {number} toY
   * @param {number} durationMs
   */
  _glideScroll(fromY, toY, durationMs) {
    this._stopGlide();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || durationMs <= 0 || Math.abs(toY - fromY) < 0.5) {
      window.scrollTo(0, toY);
      return;
    }

    const ease = easeFromCss();
    const t0 = performance.now();
    const tick = (now) => {
      if (document.body.classList.contains("is-swiping")) {
        this._scrollRaf = 0;
        return;
      }
      const t = Math.min(1, (now - t0) / durationMs);
      window.scrollTo(0, fromY + (toY - fromY) * ease(t));
      if (t < 1) {
        this._scrollRaf = requestAnimationFrame(tick);
      } else {
        window.scrollTo(0, toY);
        this._scrollRaf = 0;
      }
    };
    this._scrollRaf = requestAnimationFrame(tick);
  }

  _stopGlide() {
    if (this._scrollRaf) {
      cancelAnimationFrame(this._scrollRaf);
      this._scrollRaf = 0;
    }
  }

  _durationMs() {
    const style = getComputedStyle(document.documentElement);
    const raw =
      style.getPropertyValue("--mask-dur").trim() ||
      style.getPropertyValue("--dur").trim();
    const n = parseFloat(raw);
    if (raw.endsWith("ms")) return n || 320;
    if (raw.endsWith("s")) return (n || 0.32) * 1000;
    return 320;
  }

  _reduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  expand() {
    if (!this.root || this.expanded) return;

    this._stopGlide();
    this._clearFracPin();
    this.savedScrollY = window.scrollY;
    const targetTop = this.excerpt.getBoundingClientRect().top;
    const dur = this._durationMs();

    for (const z of this.zones) {
      if (z.height <= 0) continue;
      const target = this._reduced()
        ? z.height
        : Math.min(z.height, this._roomFor(z) + EDGE_SLACK);
      this._setHeight(z.el, target, false);
    }

    this.expanded = true;
    this.root.dataset.expanded = "true";
    this.root.classList.add("is-expanded");
    this.host.closest(".reading-card")?.setAttribute("aria-expanded", "true");
    this.host.closest(".reading-card")?.classList.add("is-dilated");

    this._driveExpand(targetTop, dur);
  }

  collapse() {
    if (!this.root || !this.expanded) return;

    this._stopPin();
    this._clearFracPin();
    const dur = this._durationMs();
    const toY = this.savedScrollY;
    const excerptTop = this.excerpt.getBoundingClientRect().top;

    if (!this._reduced()) {
      for (const z of this.zones) {
        const h = Math.min(z.el.scrollHeight, this._roomFor(z) + EDGE_SLACK);
        this._setHeight(z.el, h, true);
      }
      this._pinOnce(excerptTop);
    } else {
      for (const z of this.zones) this._setHeight(z.el, z.el.scrollHeight, true);
    }

    void this.root.offsetHeight;

    for (const z of this.zones) this._setHeight(z.el, 0, this._reduced());

    this.expanded = false;
    this.root.dataset.expanded = "false";
    this.root.classList.remove("is-expanded");
    this.host.closest(".reading-card")?.setAttribute("aria-expanded", "false");
    this.host.closest(".reading-card")?.classList.remove("is-dilated");

    this._glideScroll(window.scrollY, toY, this._reduced() ? 0 : dur);
  }
}
