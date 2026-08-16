import { loadBook, getChapter } from "./data-loader.js";
import { renderChapterMask } from "./render-evangile.js";

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
   * @param {{ bookId: string, chapter: number, verseStart: number, verseEnd: number }} ref
   */
  constructor(host, ref) {
    this.host = host;
    this.ref = ref;
    this.expanded = false;
    this.savedScrollY = 0;
    this.root = null;
    this.before = null;
    this.after = null;
    this.excerpt = null;
    this.beforeHeight = 0;
    this.afterHeight = 0;
    this._fracPin = 0;
    this._pinRaf = 0;
    this._scrollRaf = 0;
    this._onClick = this._onClick.bind(this);
    this._moved = false;
    this._down = null;
    this._ready = this._mount();
  }

  async _mount() {
    const book = await loadBook(this.ref.bookId);
    const ch = getChapter(book, this.ref.chapter);
    if (!ch) throw new Error("Chapitre introuvable");

    const { root, before, after, excerpt } = renderChapterMask(ch, {
      short: book.short,
      verseStart: this.ref.verseStart,
      verseEnd: this.ref.verseEnd,
    });

    this.root = root;
    this.before = before;
    this.after = after;
    this.excerpt = excerpt;
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

  _measureHeights() {
    if (this.before) {
      const inner = this.before.querySelector(".mask-zone-inner");
      this.beforeHeight = inner ? inner.scrollHeight : 0;
    }
    if (this.after) {
      const inner = this.after.querySelector(".mask-zone-inner");
      this.afterHeight = inner ? inner.scrollHeight : 0;
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
    const header = document.querySelector(".site-header");
    const top = header ? header.getBoundingClientRect().bottom : 0;
    return { top, bottom: window.innerHeight };
  }

  /** How much zone can grow before the overflow edge leaves the viewport. */
  _visibleRoom() {
    const clip = this._viewportClip();
    const er = this.excerpt.getBoundingClientRect();
    return {
      before: Math.max(0, er.top - clip.top),
      after: Math.max(0, clip.bottom - er.bottom),
    };
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
      this._setHeight(this.before, this.beforeHeight, true);
      this._setHeight(this.after, this.afterHeight, true);
      this._pinOnce(targetTop);
      return;
    }

    let beforeOpen = !this.before || this.beforeHeight <= 0;
    let afterOpen = !this.after || this.afterHeight <= 0;

    const t0 = performance.now();
    const tick = (now) => {
      this._pinOnce(targetTop);

      const clip = this._viewportClip();

      if (!beforeOpen && this.before) {
        if (this.before.getBoundingClientRect().top <= clip.top + 0.5) {
          this._setHeight(this.before, this.beforeHeight, true);
          this._pinOnce(targetTop);
          beforeOpen = true;
        }
      }
      if (!afterOpen && this.after) {
        if (this.after.getBoundingClientRect().bottom >= clip.bottom - 0.5) {
          this._setHeight(this.after, this.afterHeight, true);
          afterOpen = true;
        }
      }

      if ((!beforeOpen || !afterOpen) && now - t0 < durationMs + 48) {
        this._pinRaf = requestAnimationFrame(tick);
      } else {
        if (!beforeOpen) this._setHeight(this.before, this.beforeHeight, true);
        if (!afterOpen) this._setHeight(this.after, this.afterHeight, true);
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
    const room = this._visibleRoom();

    const beforeTarget = this._reduced()
      ? this.beforeHeight
      : Math.min(this.beforeHeight, room.before + EDGE_SLACK);
    const afterTarget = this._reduced()
      ? this.afterHeight
      : Math.min(this.afterHeight, room.after + EDGE_SLACK);

    if (this.beforeHeight > 0 && this.before) {
      this._setHeight(this.before, beforeTarget, false);
    }
    if (this.afterHeight > 0 && this.after) {
      this._setHeight(this.after, afterTarget, false);
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
    const room = this._visibleRoom();

    // Instantly drop the off-screen remainder so only the visible fold animates.
    if (!this._reduced()) {
      if (this.before) {
        const h = Math.min(this.before.scrollHeight, room.before + EDGE_SLACK);
        this._setHeight(this.before, h, true);
      }
      if (this.after) {
        const h = Math.min(this.after.scrollHeight, room.after + EDGE_SLACK);
        this._setHeight(this.after, h, true);
      }
      this._pinOnce(excerptTop);
    } else {
      [this.before, this.after].forEach((zone) => {
        if (!zone) return;
        this._setHeight(zone, zone.scrollHeight, true);
      });
    }

    void this.root.offsetHeight;

    this._setHeight(this.before, 0, this._reduced());
    this._setHeight(this.after, 0, this._reduced());

    this.expanded = false;
    this.root.dataset.expanded = "false";
    this.root.classList.remove("is-expanded");
    this.host.closest(".reading-card")?.setAttribute("aria-expanded", "false");
    this.host.closest(".reading-card")?.classList.remove("is-dilated");

    this._glideScroll(window.scrollY, toY, this._reduced() ? 0 : dur);
  }
}
