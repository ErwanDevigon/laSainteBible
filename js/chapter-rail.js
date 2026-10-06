import { glideToElement } from "./fade-nav.js";

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
  nav.setAttribute("aria-label", "Chapitres");
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
    a.setAttribute("aria-label", `Chapitre ${n}`);
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

  function pinInRail(a) {
    const viewTop = nav.scrollTop;
    const viewBottom = viewTop + nav.clientHeight;
    const top = a.offsetTop;
    const bottom = top + a.offsetHeight;
    if (top >= viewTop && bottom <= viewBottom) return;
    const next = top - (nav.clientHeight - a.offsetHeight) / 2;
    nav.scrollTop = Math.max(0, next);
  }

  function setCurrent(n) {
    let current = null;
    for (const a of links) {
      if (a.dataset.chapter === String(n)) {
        a.setAttribute("aria-current", "location");
        current = a;
      } else {
        a.removeAttribute("aria-current");
      }
    }
    if (current) pinInRail(current);
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
    if (!spyRaf) spyRaf = requestAnimationFrame(spy);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  function remeasure() {
    tops = null;
    targetEls.clear();
    onScroll();
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

  spy();

  return {
    destroy() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("resize", remeasure);
      if (spyRaf) cancelAnimationFrame(spyRaf);
      nav.remove();
    },
    setCurrent,
    remeasure,
  };
}
