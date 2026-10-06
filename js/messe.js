import { loadLectures, formatDateFr, todayParis, shiftIsoDate } from "./aelf.js";
import { MaskDilatation } from "./expand.js";
import { mountSwipeNav } from "./swipe-nav.js";
import {
  mountActiveEditionBar,
  getActiveEdition,
  EDITION_STACK,
} from "./editions.js";
import { listVersionIds } from "./data-loader.js";
import { bookHref } from "./books.js";
import { t } from "./i18n.js";
import {
  formatFullRef,
  attachExcerptParallels,
  prepareParallels,
} from "./parallels.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function typeLabel(type, fallback) {
  const map = {
    evangile: "gospel",
    psaume: "psalm",
    premiere: "firstReading",
    lecture: "reading",
  };
  return map[type] ? t(map[type]) : fallback || t("reading");
}

async function init() {
  const listEl = document.querySelector("[data-readings]");
  const titleEl = document.querySelector("[data-messe-title]");
  const dateNav = document.createElement("nav");
  dateNav.className = "messe-date-nav";
  dateNav.setAttribute("aria-label", t("massDate"));
  const statusEl = document.querySelector("[data-messe-status]");

  if (!listEl) return;

  mountSwipeNav();
  const available = await listVersionIds();
  const pool = available.length ? available : EDITION_STACK;
  mountActiveEditionBar(pool, {
    parallels: true,
    lift: true,
    barCenter: dateNav,
    dated: true,
    showBlurb: false,
  });

  /** @type {MaskDilatation[]} */
  const masks = [];

  async function wireParallels() {
    const edition = getActiveEdition(pool);
    await prepareParallels(edition);
    listEl.querySelectorAll(".reading-row").forEach((row) => {
      const card = row.querySelector(".reading-card");
      if (!card?.dataset.bookId) return;
      attachExcerptParallels({
        host: card,
        row,
        bookId: card.dataset.bookId,
        chapter: +card.dataset.chapter,
        verseStart: card.dataset.verseStart
          ? +card.dataset.verseStart
          : undefined,
        ranges: card._ranges,
        edition,
      });
    });
  }

  document.addEventListener("lsb:editions", () => {
    mountActiveEditionBar(pool, {
      parallels: true,
      lift: true,
      barCenter: dateNav,
      dated: true,
      showBlurb: false,
    });
    const edition = getActiveEdition(pool);
    Promise.all(masks.map((mask) => mask.remount(edition).catch(() => {}))).then(
      () => wireParallels()
    );
  });
  document.addEventListener("lsb:parallels", () => {
    wireParallels();
  });
  document.addEventListener("lsb:ui-lang", () => {
    dateNav.setAttribute("aria-label", t("massDate"));
    renderNav(currentDate);
    mountActiveEditionBar(pool, {
      parallels: true,
      lift: true,
      barCenter: dateNav,
      dated: true,
      showBlurb: false,
    });
    listEl.querySelectorAll(".reading-card").forEach((card) => {
      const node = card.querySelector(".reading-type");
      if (!node || !card.dataset.readingType) return;
      node.textContent = typeLabel(card.dataset.readingType, card.dataset.readingFallback);
    });
    listEl.querySelectorAll(".reading-ref[data-ref-book]").forEach((a) => {
      let ranges = null;
      if (a.dataset.refRanges) {
        try {
          ranges = JSON.parse(a.dataset.refRanges);
        } catch {
          ranges = null;
        }
      }
      const text = formatFullRef(
        a.dataset.refBook,
        +a.dataset.refChapter,
        a.dataset.refStart ? +a.dataset.refStart : null,
        a.dataset.refEnd ? +a.dataset.refEnd : null,
        ranges
      );
      if (text) a.textContent = text;
    });
    if (!listEl.querySelector(".reading-card")) {
      const empty = listEl.querySelector(".status-msg");
      if (empty) empty.textContent = t("noReadings");
    }
  });

  function dateFromUrl() {
    const raw = new URLSearchParams(location.search).get("date") || "";
    const today = todayParis();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
    return raw > today ? today : raw;
  }

  let currentDate = dateFromUrl();
  let paintToken = 0;
  /** @type {IntersectionObserver|null} */
  let maskObserver = null;

  function writeDate(iso) {
    const url = new URL(location.href);
    if (iso === todayParis()) url.searchParams.delete("date");
    else url.searchParams.set("date", iso);
    history.pushState({ date: iso }, "", url);
  }

  function renderNav(iso) {
    dateNav.replaceChildren();
    const prev = el("button", "messe-date-step", "<");
    prev.type = "button";
    prev.setAttribute("aria-label", t("prevDay"));
    prev.addEventListener("click", () => go(shiftIsoDate(iso, -1)));
    dateNav.append(prev, el("span", "messe-date-label", formatDateFr(iso)));
    if (iso < todayParis()) {
      const next = el("button", "messe-date-step", ">");
      next.type = "button";
      next.setAttribute("aria-label", t("nextDay"));
      next.addEventListener("click", () => go(shiftIsoDate(iso, 1)));
      dateNav.append(next);
    }
  }

  async function go(iso) {
    const today = todayParis();
    if (iso > today) iso = today;
    currentDate = iso;
    writeDate(iso);
    renderNav(iso);
    await paint(iso);
  }

  async function paint(date) {
    const token = ++paintToken;
    maskObserver?.disconnect();
    maskObserver = null;
    masks.length = 0;
    listEl.replaceChildren();
    if (statusEl) statusEl.hidden = true;

  try {
    const { data, source, error } = await loadLectures(date);
    if (token !== paintToken) return;

    if (titleEl) {
      const t = (data.liturgical_title || "").trim();
      const redundant = !t || /^messe du jour$/i.test(t) || /^lectures$/i.test(t);
      const hero = titleEl.closest(".messe-hero");
      if (redundant) {
        titleEl.hidden = true;
        titleEl.textContent = "";
        if (hero) hero.hidden = true;
      } else {
        titleEl.hidden = false;
        titleEl.textContent = t;
        if (hero) hero.hidden = false;
      }
    }
    if (statusEl) {
      if (error) {
        statusEl.hidden = false;
        statusEl.dataset.tone = "warn";
        statusEl.textContent = error;
      } else if (source === "aelf") {
        statusEl.hidden = true;
      }
    }

    await prepareParallels(getActiveEdition(pool));
    listEl.replaceChildren();
    maskObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          maskObserver.unobserve(entry.target);
          entry.target._armMask?.();
        }
      },
      { rootMargin: "600px 0px" }
    );
    if (!data.readings?.length) {
      listEl.appendChild(
        el("p", "status-msg", t("noReadings"))
      );
      return;
    }

    for (const reading of data.readings) {
      const expandable = !!(reading.expandable && reading.ref);

      const card = el("article", "reading-card");
      card.dataset.expandable = expandable ? "true" : "false";

      card.dataset.readingType = reading.type || "";
      if (reading.label) card.dataset.readingFallback = reading.label;
      card.appendChild(
        el("div", "reading-type", typeLabel(reading.type, reading.label))
      );
      if (reading.ref_display) {
        if (reading.ref?.bookId && reading.ref?.chapter) {
          const a = el("a", "reading-ref");
          a.href = bookHref(reading.ref.bookId, "lire/", {
            chapter: reading.ref.chapter,
            verse: reading.ref.verseStart || null,
          });
          a.dataset.refBook = reading.ref.bookId;
          a.dataset.refChapter = String(reading.ref.chapter);
          if (reading.ref.verseStart) a.dataset.refStart = String(reading.ref.verseStart);
          if (reading.ref.verseEnd) a.dataset.refEnd = String(reading.ref.verseEnd);
          if (reading.ref.ranges) a.dataset.refRanges = JSON.stringify(reading.ref.ranges);
          a.textContent = formatFullRef(
            reading.ref.bookId,
            reading.ref.chapter,
            reading.ref.verseStart,
            reading.ref.verseEnd,
            reading.ref.ranges
          ) || reading.ref_display;
          card.appendChild(a);
        } else {
          card.appendChild(el("div", "reading-ref", reading.ref_display));
        }
      }

      if (expandable) {
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-expanded", "false");

        const body = el("div", "reading-mask-host");
        // skeleton while chapter loads
        const sk = el("div", "skeleton");
        sk.setAttribute("aria-hidden", "true");
        sk.appendChild(Object.assign(el("div", "skeleton-line w-80"), {}));
        sk.appendChild(Object.assign(el("div", "skeleton-line"), {}));
        sk.appendChild(Object.assign(el("div", "skeleton-line w-60"), {}));
        body.appendChild(sk);
        card.appendChild(body);

        const armMask = () => {
          if (card._mask) return card._mask;
          const mask = new MaskDilatation(body, {
            bookId: reading.ref.bookId,
            chapter: reading.ref.chapter,
            altChapter: reading.ref.altChapter,
            verseStart: reading.ref.verseStart,
            verseEnd: reading.ref.verseEnd,
            ranges: reading.ref.ranges,
            edition: getActiveEdition(pool),
            fallback: reading.excerpt || "Passage indisponible.",
          });
          card._mask = mask;
          masks.push(mask);
          mask.whenReady().then(() => {
            if (card._openWhenReady && !mask.expanded) mask.expand();
            card._bindRails?.();
          }).catch((err) => {
            console.error(err);
            body.replaceChildren();
            const excerpt = el("div", "reading-excerpt");
            excerpt.textContent = reading.excerpt || "Passage indisponible.";
            body.appendChild(excerpt);
            card.dataset.expandable = "false";
          });
          return mask;
        };
        card._armMask = armMask;
        maskObserver.observe(card);

        const toggleMask = () => {
          const mask = card._mask;
          if (!mask) {
            card._openWhenReady = true;
            armMask();
            return;
          }
          mask.toggle();
        };

        // Clic sur en-tête de carte (type / réf) : même dilatation
        card.addEventListener("click", (e) => {
          if (e.target.closest(".chapter-mask")) return; // déjà géré
          if (e.target.closest("a, button, select")) return;
          toggleMask();
        });
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleMask();
          }
        });
      } else {
        const excerpt = el("div", "reading-excerpt");
        const text = reading.excerpt || "";
        excerpt.textContent =
          text.length > 520 ? text.slice(0, 520).trim() + "…" : text;
        card.appendChild(excerpt);
      }

      const row = el("div", "reading-row");
      row.appendChild(card);
      listEl.appendChild(row);
      if (reading.ref?.bookId && reading.ref?.chapter) {
        card.dataset.bookId = reading.ref.bookId;
        card.dataset.chapter = String(reading.ref.chapter);
        if (reading.ref.verseStart != null) {
          card.dataset.verseStart = String(reading.ref.verseStart);
        }
        card._ranges = reading.ref.ranges;
        card._bindRails = () =>
          attachExcerptParallels({
            host: card,
            row,
            bookId: reading.ref.bookId,
            chapter: reading.ref.chapter,
            verseStart: reading.ref.verseStart,
            ranges: reading.ref.ranges,
            edition: getActiveEdition(pool),
          });
        if (!expandable) card._bindRails();
      }
    }
  } catch (err) {
    console.error(err);
    listEl.replaceChildren();
    const msg = el("p", "status-msg");
    msg.dataset.tone = "warn";
    msg.textContent = "Erreur de chargement des lectures.";
    listEl.appendChild(msg);
  }
  }

  window.addEventListener("popstate", () => {
    currentDate = dateFromUrl();
    renderNav(currentDate);
    paint(currentDate);
  });

  renderNav(currentDate);
  paint(currentDate);
}

init();
