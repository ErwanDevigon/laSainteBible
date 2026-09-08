import {
  tryLoadBook,
  chapterNums,
  loadVersionIndex,
  versionsForBook,
} from "./data-loader.js";
import { renderAlignedBook, parseHash } from "./render-evangile.js";
import { mountParallels } from "./parallels.js";
import { fadeTo, jumpToElement, veilNow, glideToElement } from "./fade-nav.js";
import { mountChapterRail } from "./chapter-rail.js";
import { mountSwipeNav } from "./swipe-nav.js";
import { BOOK_BY_ID } from "./books.js";
import {
  wrapCurrentPane,
  mountReaderChrome,
  orderedEditions,
  editionCol,
  editionDisplayName,
  getActiveEdition,
  prependReaderColumn,
  nextUnusedColumn,
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
    const available = await versionsForBook(bookId);
    if (!available.length) throw new Error("Aucune version");

    const books = {};
    await Promise.all(
      available.map(async (id) => {
        books[id] = await tryLoadBook(bookId, id);
      })
    );
    const present = available.filter((id) => books[id]);
    if (!present.length) throw new Error("Livre introuvable");

    const active0 = getActiveEdition(present);
    const primaryBook = books[active0] || books[present[0]];
    const meta = BOOK_BY_ID[bookId];
    const title = primaryBook.title || meta?.title || bookId;
    if (titleEl) titleEl.textContent = title;
    if (metaEl) metaEl.textContent = editionDisplayName(active0);
    document.title = `${title} — La Sainte Bible`;

    const index = await loadVersionIndex(active0);
    const section = index?.books?.find((b) => b.id === bookId)?.section;
    const peers = (index?.books || []).filter((b) => b.section === section);

    let railApi = null;
    document.body.classList.toggle("has-psalm-rail", bookId === "psaumes");

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

    function visibleOrder() {
      return orderedEditions(present);
    }

    function editionStepPx() {
      const cell = document.querySelector(".edition-name-stage p");
      const stage = document.querySelector(".edition-name-stage");
      if (cell && stage) {
        const gap = parseFloat(getComputedStyle(stage).columnGap) || 0;
        return cell.getBoundingClientRect().width + gap;
      }
      const pair = document.querySelector(".chapter-pair > *");
      if (pair) {
        const gap = parseFloat(
          getComputedStyle(document.querySelector(".edition-stage")).columnGap
        ) || 0;
        return pair.getBoundingClientRect().width + gap;
      }
      return Math.max(280, window.innerWidth * 0.72);
    }

    let growing = false;
    function maybeGrow(x) {
      if (growing) return;
      const order = visibleOrder();
      const step = editionStepPx();
      const max = Math.max(0, order.length - 1) * step;
      if (x < max + step * 0.32) return;
      const next = nextUnusedColumn(order, present);
      if (!next) return;
      growing = true;
      const base = parseFloat(document.body.dataset.swipeBase) || 0;
      document.body.dataset.swipeBase = String(base + step);
      document.body.style.setProperty("--swipe-x", `${x + step}px`);
      prependReaderColumn(next, present);
      growing = false;
    }

    function paint() {
      const order = visibleOrder().filter((id) => books[id]);
      if (!order.length) return;
      const editions = order.map((id, i) => ({
        book: books[id],
        col: editionCol(id),
        label: editionDisplayName(id),
        primary: i === order.length - 1,
      }));

      mountReaderChrome({
        title,
        bookId,
        peers,
        labels: editions.map((ed, i) => ({
          id: order[i],
          col: ed.col,
          label: ed.label,
        })),
        available: present,
      });

      const y = window.scrollY;
      renderAlignedBook({
        editions,
        container: bodyEl,
        end: null,
      });
      mountParallels({
        bookId,
        container: bodyEl,
        editions,
      });
      window.scrollTo(0, y);

      document.querySelector(".book-header")?.setAttribute("hidden", "");
      document.querySelector("body > .site-footer")?.remove();
      document.querySelector(".book-end")?.remove();

      wrapCurrentPane(order[order.length - 1]);

      if (!railApi) {
        const nums = chapterNums(primaryBook);
        railApi = mountChapterRail({
          chapters: nums,
          columns: bookId === "psaumes" ? 3 : 1,
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
    document.addEventListener("lsb:parallels", () => {
      paint();
    });
    document.body.addEventListener("lsb:pan", (e) => {
      maybeGrow(e.detail?.x || 0);
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
