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
  editionDisplayName,
  getActiveEdition,
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
    const guessed = getActiveEdition();
    const [available, guessedBook] = await Promise.all([
      versionsForBook(bookId),
      tryLoadBook(bookId, guessed),
    ]);
    if (!available.length) throw new Error("Aucune version");

    const books = {};
    if (guessedBook) books[guessed] = guessedBook;
    const present = available.slice();

    async function ensureLoaded(ids) {
      await Promise.all(
        ids
          .filter((id) => !books[id])
          .map(async (id) => {
            books[id] = await tryLoadBook(bookId, id);
          })
      );
    }

    const active0 = getActiveEdition(present);
    await ensureLoaded([active0]);
    let primaryBook = books[active0];
    if (!primaryBook) {
      await ensureLoaded(present);
      primaryBook = books[present.find((id) => books[id])];
    }
    if (!primaryBook) throw new Error("Livre introuvable");
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

    let lastEditions = [];
    let paintToken = 0;
    let paintedOnce = false;

    function captureAnchor() {
      const labels = bodyEl.querySelectorAll(".chapter-label[id]");
      if (!labels.length) return null;
      const line = railOffset() + 8;
      let best = labels[0];
      for (const el of labels) {
        if (el.getBoundingClientRect().top <= line + 12) best = el;
        else break;
      }
      const docTop = best.getBoundingClientRect().top + window.scrollY;
      return { id: best.id, delta: window.scrollY - (docTop - line) };
    }

    async function paint() {
      const token = ++paintToken;
      const anchor = paintedOnce ? captureAnchor() : null;
      const hashRef = !paintedOnce && hasHash ? parseHash() : null;
      const order = visibleOrder();
      await ensureLoaded(order);
      if (token !== paintToken) return;
      const loaded = order.filter((id) => books[id]);
      if (!loaded.length) return;
      const editions = loaded.map((id, i) => ({
        book: books[id],
        col: `c${i}`,
        label: editionDisplayName(id),
        primary: i === loaded.length - 1,
      }));
      lastEditions = editions;
      const priority = hashRef?.chapter || (anchor ? parseInt(anchor.id.slice(1), 10) : null);

      mountReaderChrome({
        title,
        bookId,
        peers,
        labels: editions.map((ed, i) => ({
          id: loaded[i],
          col: ed.col,
          label: ed.label,
        })),
        available: present,
      });

      const job = renderAlignedBook({
        editions,
        container: bodyEl,
        end: null,
        priority,
      });
      paintedOnce = true;

      document.querySelector(".book-header")?.setAttribute("hidden", "");
      document.querySelector("body > .site-footer")?.remove();
      document.querySelector(".book-end")?.remove();

      wrapCurrentPane(loaded[loaded.length - 1]);

      const step = editionStepPx();
      const maxX = Math.max(0, loaded.length - 1) * step;
      const x = parseFloat(document.body.style.getPropertyValue("--swipe-x")) || 0;
      if (x > maxX) {
        document.body.style.setProperty("--swipe-x", `${maxX}px`);
        document.body.dataset.swipeBase = String(maxX);
      }

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

      const renderToken = job.token;
      requestAnimationFrame(() => {
        if (bodyEl._renderToken !== renderToken) return;
        mountParallels({
          bookId,
          container: bodyEl,
          editions,
        });
      });

      job.ready.then(() => {
        if (token !== paintToken) return;
        if (anchor) {
          const el = bodyEl.querySelector(`#${CSS.escape(anchor.id)}`);
          if (el) {
            const docTop = el.getBoundingClientRect().top + window.scrollY;
            window.scrollTo(0, Math.max(0, docTop - railOffset() - 8 + anchor.delta));
          }
        }
        railApi?.remeasure();
      });
      job.done.then(() => {
        if (token !== paintToken) return;
        railApi?.remeasure();
      });

      return job;
    }

    const firstJob = await paint();

    document.addEventListener("lsb:editions", () => {
      paint();
    });
    document.addEventListener("lsb:parallels", () => {
      mountParallels({
        bookId,
        container: bodyEl,
        editions: lastEditions,
      });
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
