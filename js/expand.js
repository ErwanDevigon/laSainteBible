import { loadBook, getChapter } from "./data-loader.js";
import { renderChapterMask } from "./render-evangile.js";

/**
 * In-place mask dilatation.
 * Excerpt stays pinned in the viewport while before/after unmask
 * (pushes other content away without yanking the reader to v1).
 * Collapse restores scrollY saved at expand.
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
    this._pinRaf = 0;
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

    return book;
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

  /**
   * Keep excerpt at the same viewport Y while layout grows/shrinks.
   * @param {number} targetTop - getBoundingClientRect().top to hold
   * @param {number} durationMs
   */
  _pinExcerpt(targetTop, durationMs) {
    this._stopPin();
    const excerpt = this.excerpt;
    if (!excerpt) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const dy = excerpt.getBoundingClientRect().top - targetTop;
      if (dy) window.scrollBy(0, dy);
      return;
    }

    const t0 = performance.now();
    const tick = (now) => {
      const dy = excerpt.getBoundingClientRect().top - targetTop;
      if (Math.abs(dy) > 0.25) {
        window.scrollBy(0, dy);
      }
      if (now - t0 < durationMs + 48) {
        this._pinRaf = requestAnimationFrame(tick);
      } else {
        // final snap
        const d = excerpt.getBoundingClientRect().top - targetTop;
        if (Math.abs(d) > 0.25) window.scrollBy(0, d);
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

  _durationMs() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--dur")
      .trim();
    const n = parseFloat(raw);
    if (raw.endsWith("ms")) return n || 320;
    if (raw.endsWith("s")) return (n || 0.32) * 1000;
    return 320;
  }

  expand() {
    if (!this.root || this.expanded) return;

    this.savedScrollY = window.scrollY;
    const targetTop = this.excerpt.getBoundingClientRect().top;
    const dur = this._durationMs();

    this.expanded = true;
    this.root.dataset.expanded = "true";
    this.root.classList.add("is-expanded");
    this.host.closest(".reading-card")?.setAttribute("aria-expanded", "true");
    this.host.closest(".reading-card")?.classList.add("is-dilated");

    // Pin excerpt in place while before opens upward (via scroll) and after downward
    this._pinExcerpt(targetTop, dur);
  }

  collapse() {
    if (!this.root || !this.expanded) return;

    this._stopPin();
    const targetTop = this.excerpt.getBoundingClientRect().top;
    const dur = this._durationMs();
    const y = this.savedScrollY;

    this.expanded = false;
    this.root.dataset.expanded = "false";
    this.root.classList.remove("is-expanded");
    this.host.closest(".reading-card")?.setAttribute("aria-expanded", "false");
    this.host.closest(".reading-card")?.classList.remove("is-dilated");

    // During fold: keep excerpt steady, then restore original page position
    this._pinExcerpt(targetTop, dur);

    window.setTimeout(() => {
      this._stopPin();
      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      html.style.scrollBehavior = prev;
    }, dur + 40);
  }
}
