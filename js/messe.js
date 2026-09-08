import { loadLectures, formatDateFr, todayParis } from "./aelf.js";
import { MaskDilatation } from "./expand.js";
import { mountSwipeNav } from "./swipe-nav.js";
import {
  mountActiveEditionBar,
  getActiveEdition,
  EDITION_STACK,
} from "./editions.js";
import { listVersionIds } from "./data-loader.js";
import { bookHref } from "./books.js";
import { formatFullRef, attachExcerptParallels } from "./parallels.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function typeLabel(type, fallback) {
  const map = {
    evangile: "Évangile",
    psaume: "Psaume",
    premiere: "Première lecture",
    lecture: "Lecture",
  };
  return map[type] || fallback || "Lecture";
}

async function init() {
  const listEl = document.querySelector("[data-readings]");
  const titleEl = document.querySelector("[data-messe-title]");
  const dateEl = document.querySelector("[data-messe-date]");
  const statusEl = document.querySelector("[data-messe-status]");

  if (!listEl) return;

  mountSwipeNav();
  const available = await listVersionIds();
  const pool = available.length ? available : EDITION_STACK;
  mountActiveEditionBar(pool);

  /** @type {MaskDilatation[]} */
  const masks = [];

  document.addEventListener("lsb:editions", () => {
    mountActiveEditionBar(pool);
    const edition = getActiveEdition(pool);
    for (const mask of masks) {
      mask.remount(edition).catch(() => {});
    }
  });

  const date = todayParis();
  if (dateEl) dateEl.textContent = formatDateFr(date);

  try {
    const { data, source, error } = await loadLectures(date);

    if (titleEl) {
      const t = (data.liturgical_title || "").trim();
      const redundant = !t || /^messe du jour$/i.test(t) || /^lectures$/i.test(t);
      if (redundant) {
        titleEl.hidden = true;
        titleEl.textContent = "";
      } else {
        titleEl.hidden = false;
        titleEl.textContent = t;
      }
    }
    if (data.date && dateEl) {
      dateEl.textContent = formatDateFr(data.date);
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

    listEl.replaceChildren();
    if (!data.readings?.length) {
      listEl.appendChild(
        el("p", "status-msg", "Aucune lecture à afficher pour ce jour.")
      );
      return;
    }

    for (const reading of data.readings) {
      const expandable = !!(reading.expandable && reading.ref);

      const card = el("article", "reading-card");
      card.dataset.expandable = expandable ? "true" : "false";

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
        masks.push(mask);

        mask.whenReady().catch((err) => {
          console.error(err);
          body.replaceChildren();
          // fallback plain excerpt
          const excerpt = el("div", "reading-excerpt");
          excerpt.textContent = reading.excerpt || "Passage indisponible.";
          body.appendChild(excerpt);
          card.dataset.expandable = "false";
        });

        // Clic sur en-tête de carte (type / réf) : même dilatation
        card.addEventListener("click", (e) => {
          if (e.target.closest(".chapter-mask")) return; // déjà géré
          if (e.target.closest("a, button, select")) return;
          mask.toggle();
        });
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            mask.toggle();
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
        attachExcerptParallels({
          host: card,
          row,
          bookId: reading.ref.bookId,
          chapter: reading.ref.chapter,
          verseStart: reading.ref.verseStart,
          edition: getActiveEdition(pool),
        });
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

init();
