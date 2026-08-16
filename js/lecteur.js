import { loadBook, chapterCount } from "./data-loader.js";
import { renderBook, parseHash } from "./render-evangile.js";
import { GOSPEL_META } from "./nav-books.js";
import { fadeTo, jumpToElement, veilNow, glideToElement } from "./fade-nav.js";
import { mountChapterRail } from "./chapter-rail.js";
import { mountSwipeNav } from "./swipe-nav.js";

const BOOKS = GOSPEL_META.map((b) => ({
  id: b.id,
  href: `${b.id}.html#c1`,
  label: b.label,
}));

const VERSION_LABEL = "Traduction de Louis Segond · 1910";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function findRefEl(bodyEl, ref) {
  if (!ref) return null;
  if (ref.verse) {
    return (
      bodyEl.querySelector(`#c${ref.chapter}v${ref.verse}`) ||
      document.getElementById(`c${ref.chapter}v${ref.verse}`)
    );
  }
  return (
    bodyEl.querySelector(`#c${ref.chapter}`) ||
    document.getElementById(`c${ref.chapter}`)
  );
}

async function init() {
  const root = document.querySelector("[data-book]");
  if (!root) return;

  // If deep-linking to a chapter, cover immediately (no flash of c1)
  const hasHash = !!parseHash();
  if (hasHash) veilNow();

  mountSwipeNav();

  const bookId = root.dataset.book;
  const titleEl = document.querySelector("[data-book-title]");
  const metaEl = document.querySelector("[data-book-meta]");
  const bodyEl = document.querySelector("[data-book-body]");
  const navEl = document.querySelector("[data-book-nav]");

  if (navEl) {
    for (const b of BOOKS) {
      const a = el("a", null, b.label);
      a.href = b.href;
      if (b.id === bookId) a.setAttribute("aria-current", "page");
      navEl.appendChild(a);
    }
  }

  try {
    const book = await loadBook(bookId);
    if (titleEl) titleEl.textContent = book.title;
    if (metaEl) metaEl.textContent = VERSION_LABEL;
    document.title = `${book.title} — La Sainte Bible`;

    renderBook(book, bodyEl);

    const headerEl = document.querySelector(".site-header");
    const railOffset = () => (headerEl?.offsetHeight || 0) + 12;
    mountChapterRail({
      chapterCount: chapterCount(book),
      getTarget: (n) =>
        bodyEl.querySelector(`#c${n}`) || document.getElementById(`c${n}`),
      offset: railOffset,
    });

    if (hasHash) {
      // already veiled — jump under black, then soft unveil
      const ref = parseHash();
      fadeTo(
        () => {
          const target = findRefEl(bodyEl, ref);
          jumpToElement(target, { offset: railOffset() });
          requestAnimationFrame(() =>
            jumpToElement(target, { offset: railOffset() })
          );
        },
        { alreadyVeiled: true, holdMs: 280, fadeMs: 680 }
      );
    }

    window.addEventListener("hashchange", () => {
      const ref = parseHash();
      const target = findRefEl(bodyEl, ref);
      if (target) glideToElement(target, { offset: railOffset() });
    });
  } catch (err) {
    console.error(err);
    bodyEl.replaceChildren();
    const msg = el("p", "status-msg");
    msg.dataset.tone = "warn";
    msg.textContent =
      "Impossible de charger le texte. Vérifiez que le site est servi en HTTP.";
    bodyEl.appendChild(msg);
  }
}

init();
