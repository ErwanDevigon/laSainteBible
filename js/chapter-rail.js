import { glideToElement } from "./fade-nav.js";

/**
 * Fixed left column of chapter numbers.
 *
 * @param {{
 *   chapterCount?: number,
 *   chapters?: number[],
 *   columns?: number,
 *   getTarget: (n: number) => Element|null,
 *   offset?: () => number,
 * }} opts
 */
export function mountChapterRail({
  chapterCount,
  chapters,
  columns = 1,
  getTarget,
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
  if (columns > 1) nav.classList.add("is-psalms");
  nav.setAttribute("aria-label", "Chapitres");
  nav.style.setProperty("--chapter-count", String(nums.length));
  nav.style.setProperty("--rail-cols", String(columns));
  const rows = Math.ceil(nums.length / Math.max(1, columns));
  nav.style.setProperty("--psalm-rows", String(rows));

  /** @type {HTMLAnchorElement[]} */
  const links = [];

  for (const n of nums) {
    const a = document.createElement("a");
    a.href = `#c${n}`;
    a.textContent = String(n);
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

  function setCurrent(n) {
    for (const a of links) {
      if (a.dataset.chapter === String(n)) {
        a.setAttribute("aria-current", "location");
      } else {
        a.removeAttribute("aria-current");
      }
    }
  }

  let spyRaf = 0;
  const spy = () => {
    spyRaf = 0;
    const line = offset();
    let best = nums[0];
    for (const n of nums) {
      const el = getTarget(n);
      if (!el) continue;
      if (el.getBoundingClientRect().top - line <= 12) best = n;
    }
    setCurrent(best);
  };

  const onScroll = () => {
    if (!spyRaf) spyRaf = requestAnimationFrame(spy);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

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
      if (spyRaf) cancelAnimationFrame(spyRaf);
      nav.remove();
    },
    setCurrent,
  };
}
