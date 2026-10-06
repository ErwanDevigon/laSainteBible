import { glideToElement } from "./fade-nav.js";
import { t } from "./i18n.js";

/**
 * Fixed left column of chapter numbers.
 *
 * @param {{
 *   chapterCount?: number,
 *   chapters?: number[],
 *   getTarget: (n: number) => Element|null,
 *   offset?: () => number,
 * }} opts
 */
export function mountChapterRail({
  chapterCount,
  chapters,
  getTarget,
  getOffset = null,
  offset = () => 0,
}) {
  document.querySelector(".chapter-rail")?.remove();

  const nums =
    Array.isArray(chapters) && chapters.length
      ? chapters
      : Array.from({ length: chapterCount || 0 }, (_, i) => i + 1);
  if (!nums.length) return { destroy() {}, setCurrent() {} };

  const nav = document.createElement("nav");
  nav.className = "chapter-rail";
  nav.setAttribute("aria-label", t("chapters"));
  nav.style.setProperty("--chapter-count", String(nums.length));

  /** @type {HTMLAnchorElement[]} */
  const links = [];

  for (const n of nums) {
    const a = document.createElement("a");
    a.href = `#c${n}`;
    const num = document.createElement("span");
    num.className = "chapter-rail-num";
    num.textContent = String(n);
    a.appendChild(num);
    a.dataset.chapter = String(n);
    a.setAttribute("aria-label", t("chapter", n));
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const el = getTarget(n);
      if (!el) return;
      glideToElement(el, { offset: offset() });
      history.pushState({ chapter: n }, "", `#c${n}`);
      setCurrent(n);
    });
    nav.appendChild(a);
    links.push(a);
  }

  document.body.appendChild(nav);
  const relabel = () => {
    nav.setAttribute("aria-label", t("chapters"));
    for (const a of links) a.setAttribute("aria-label", t("chapter", a.dataset.chapter));
  };
  document.addEventListener("lsb:ui-lang", relabel);

  // One pixel of movement, both ways, even after the rail has hit its end.
  // Absolute scrollY would pin the rail at the bottom for the rest of Psalms.
  let lock = false;
  let lastPage = window.scrollY;
  let lastRail = 0;

  function markOverflow() {
    nav.style.paddingTop = "";
    nav._anchored = nav.scrollHeight > nav.clientHeight + 1;
  }

  function railLimit() {
    return Math.max(0, nav.scrollHeight - nav.clientHeight);
  }

  function remember() {
    lastPage = window.scrollY;
    lastRail = nav.scrollTop;
  }

  function railFromPage() {
    const y = window.scrollY;
    const dy = y - lastPage;
    lastPage = y;
    if (lock || !nav._anchored || Math.abs(dy) < 0.5) return;
    const max = railLimit();
    if (max <= 0) return;
    const next = Math.max(0, Math.min(max, nav.scrollTop + dy));
    if (Math.abs(next - nav.scrollTop) < 0.5) return;
    lock = true;
    nav.scrollTop = next;
    lastRail = nav.scrollTop;
    lock = false;
  }

  function pageFromRail() {
    const y = nav.scrollTop;
    const dy = y - lastRail;
    lastRail = y;
    if (lock || !nav._anchored || Math.abs(dy) < 0.5) return;
    lock = true;
    window.scrollTo(0, Math.max(0, window.scrollY + dy));
    lastPage = window.scrollY;
    lock = false;
  }

  function setCurrent(n) {
    for (const a of links) {
      if (a.dataset.chapter === String(n)) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    }
  }

  const targetEls = new Map();
  function target(n) {
    const prev = targetEls.get(n);
    if (prev?.isConnected) return prev;
    const el = getTarget(n);
    if (el) targetEls.set(n, el);
    else targetEls.delete(n);
    return el || null;
  }

  let tops = null;
  function measure() {
    const scroll = window.scrollY;
    const useOffset = typeof getOffset === "function";
    tops = nums.map((n) => {
      if (useOffset) {
        const off = getOffset(n);
        return off != null && Number.isFinite(off) ? off : Infinity;
      }
      const el = target(n);
      if (!el) return Infinity;
      return el.getBoundingClientRect().top + scroll;
    });
  }

  let spyRaf = 0;
  const spy = () => {
    spyRaf = 0;
    if (!tops) measure();
    const line = window.scrollY + offset() + 12;
    let lo = 0;
    let hi = tops.length - 1;
    let best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (tops[mid] <= line) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    setCurrent(nums[best]);
  };

  const onScroll = () => {
    railFromPage();
    if (!spyRaf) spyRaf = requestAnimationFrame(spy);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  nav.addEventListener("scroll", pageFromRail, { passive: true });

  function remeasure() {
    tops = null;
    targetEls.clear();
    markOverflow();
    remember();
    if (!spyRaf) spyRaf = requestAnimationFrame(spy);
  }
  window.addEventListener("resize", remeasure);
  document.fonts?.ready?.then(() => {
    if (!nav.isConnected) return;
    remeasure();
  });

  const onPop = () => {
    const m = /^#c(\d+)/i.exec(location.hash || "");
    const n = m ? parseInt(m[1], 10) : nums[0];
    const el = getTarget(n);
    if (el) glideToElement(el, { offset: offset() });
  };
  window.addEventListener("popstate", onPop);

  markOverflow();
  spy();
  if (nav._anchored) {
    const max = railLimit();
    nav.scrollTop = Math.max(0, Math.min(max, window.scrollY));
  }
  remember();

  return {
    destroy() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("resize", remeasure);
      nav.removeEventListener("scroll", pageFromRail);
      document.removeEventListener("lsb:ui-lang", relabel);
      if (spyRaf) cancelAnimationFrame(spyRaf);
      nav.remove();
    },
    setCurrent,
    remeasure,
  };
}
