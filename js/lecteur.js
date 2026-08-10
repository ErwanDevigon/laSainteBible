import { loadBook } from "./data-loader.js";
import { renderBook, parseHash } from "./render-evangile.js";
import { GOSPEL_META } from "./nav-books.js";
import { fadeTo, jumpToElement, veilNow } from "./fade-nav.js";

const BOOKS = GOSPEL_META.map((b) => ({
  id: b.id,
  href: `${b.id}.html`,
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

/**
 * Peaceful arrival: fade to black → instant jump → fade in.
 * Never uses smooth / high-speed scrolling.
 */
function jumpToHash(bodyEl, { withFade = true } = {}) {
  const ref = parseHash();
  if (!ref) return;

  const header = document.querySelector(".site-header");
  const offset = (header?.offsetHeight || 0) + 12;

  const doJump = () => {
    const target = findRefEl(bodyEl, ref);
    if (!target) return;
    jumpToElement(target, { offset });
    // second settle under veil / after fonts
    requestAnimationFrame(() => {
      jumpToElement(target, { offset });
    });
  };

  // Layout must exist first
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (withFade) fadeTo(doJump);
      else doJump();
    });
  });
}

async function init() {
  const root = document.querySelector("[data-book]");
  if (!root) return;

  // If deep-linking to a chapter, cover immediately (no flash of c1)
  const hasHash = !!parseHash();
  if (hasHash) veilNow();

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

    if (hasHash) {
      // already veiled — jump under black, then soft unveil
      const ref = parseHash();
      const header = document.querySelector(".site-header");
      const offset = (header?.offsetHeight || 0) + 12;
      fadeTo(
        () => {
          const target = findRefEl(bodyEl, ref);
          jumpToElement(target, { offset });
          requestAnimationFrame(() => jumpToElement(target, { offset }));
        },
        { alreadyVeiled: true, holdMs: 280, fadeMs: 680 }
      );
    }

    window.addEventListener("hashchange", () => {
      jumpToHash(bodyEl, { withFade: true });
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
