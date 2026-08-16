import { tryLoadBook, loadBook, chapterCount } from "./data-loader.js";
import { renderAlignedBook, parseHash } from "./render-evangile.js";
import { fadeTo, jumpToElement, veilNow, glideToElement } from "./fade-nav.js";
import { mountChapterRail } from "./chapter-rail.js";
import { mountSwipeNav } from "./swipe-nav.js";
import { BOOK_BY_ID, bookHref, neighborBooks } from "./books.js";
import {
  wrapCurrentPane,
  mountReaderChrome,
  orderedEditions,
  editionCol,
  editionLabel,
  EDITION_SEGOND,
  EDITION_SEPTANTE,
  EDITION_VULGATE,
} from "./editions.js";

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

function resolveBookId() {
  const root = document.querySelector("[data-book]");
  const q = new URLSearchParams(window.location.search).get("livre");
  const id = (root?.dataset.book || q || "").trim();
  if (root && id) root.dataset.book = id;
  return id;
}

function fillBookEnd(endEl, bookId) {
  if (!endEl) return;
  endEl.replaceChildren();
  const { prev, next } = neighborBooks(bookId);
  const inLire = /\/lire(\/|$)/.test(window.location.pathname);
  const base = inLire ? "" : "lire/";
  if (prev) {
    const a = document.createElement("a");
    a.href = bookHref(prev.id, base);
    a.textContent = prev.name;
    endEl.append(a);
  }
  if (next) {
    const a = document.createElement("a");
    a.href = bookHref(next.id, base);
    a.textContent = next.name;
    endEl.append(a);
  }
  const messe = document.createElement("a");
  messe.href = inLire ? "../messe.html" : "messe.html";
  messe.textContent = "Messe du jour";
  endEl.append(messe);
}

async function init() {
  const root = document.querySelector("[data-book]");
  if (!root) return;

  const bookId = resolveBookId();
  if (!bookId) return;

  const hasHash = !!parseHash();
  if (hasHash) veilNow();

  mountSwipeNav();

  const titleEl = document.querySelector("[data-book-title]");
  const metaEl = document.querySelector("[data-book-meta]");
  const bodyEl = document.querySelector("[data-book-body]");

  try {
    const [segond, septante, vulgate] = await Promise.all([
      loadBook(bookId),
      tryLoadBook(bookId, EDITION_SEPTANTE),
      tryLoadBook(bookId, EDITION_VULGATE),
    ]);
    const books = { [EDITION_SEGOND]: segond };
    if (septante) books[EDITION_SEPTANTE] = septante;
    if (vulgate) books[EDITION_VULGATE] = vulgate;
    const available = [
      vulgate ? EDITION_VULGATE : null,
      septante ? EDITION_SEPTANTE : null,
      EDITION_SEGOND,
    ].filter(Boolean);

    const book = segond;
    const meta = BOOK_BY_ID[bookId];
    const title = book.title || meta?.title || bookId;
    if (titleEl) titleEl.textContent = title;
    if (metaEl) metaEl.textContent = editionLabel(EDITION_SEGOND);
    document.title = `${title} — La Sainte Bible`;

    let railApi = null;

    function railOffset() {
      const headerEl = document.querySelector(".site-header");
      const titleBar = document.querySelector(".book-title-bar");
      const nameBar = document.querySelector(".edition-name-bar");
      return (
        (headerEl?.offsetHeight || 0) +
        (titleBar?.offsetHeight || 0) +
        (nameBar?.offsetHeight || 0) +
        12
      );
    }

    function paint() {
      const order = orderedEditions(available);
      const editions = order.map((id, i) => ({
        book: books[id],
        col: editionCol(id),
        label: editionLabel(id),
        primary: i === order.length - 1,
      }));

      mountReaderChrome({
        title,
        bookId,
        labels: editions.map((ed, i) => ({
          id: order[i],
          col: ed.col,
          label: ed.label,
        })),
        available,
      });

      let endEl = document.querySelector(".book-end");
      if (!endEl) {
        endEl = el("p", "book-end");
      }
      fillBookEnd(endEl, bookId);

      const y = window.scrollY;
      renderAlignedBook({
        editions,
        container: bodyEl,
        end: endEl,
      });
      window.scrollTo(0, y);

      const pageHead = document.querySelector(".book-header");
      if (pageHead) pageHead.hidden = true;
      const pageFoot = document.querySelector("body > .site-footer");
      if (pageFoot) pageFoot.hidden = true;

      wrapCurrentPane(order[order.length - 1]);

      if (!railApi) {
        railApi = mountChapterRail({
          chapterCount: chapterCount(book),
          getTarget: (n) =>
            bodyEl.querySelector(`#c${n}`) || document.getElementById(`c${n}`),
          offset: railOffset,
        });
      }
    }

    paint();

    document.addEventListener("lsb:editions", () => {
      paint();
    });

    if (hasHash) {
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
