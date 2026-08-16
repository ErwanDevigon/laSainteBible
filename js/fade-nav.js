/**
 * Peaceful fade-to-black navigation.
 * No high-speed scroll — veil, jump, unveil.
 */

const VEIL_ID = "page-veil";

function ensureVeil() {
  let el = document.getElementById(VEIL_ID);
  if (el) return el;
  el = document.createElement("div");
  el.id = VEIL_ID;
  el.className = "page-veil";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  return el;
}

/** Cover page immediately (no anim) — call before first paint jump. */
export function veilNow() {
  const veil = ensureVeil();
  veil.classList.add("is-on", "is-visible");
  veil.style.transition = "none";
  void veil.offsetWidth;
  veil.style.transition = "";
  return veil;
}

function prefersReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * @param {() => void} jumpFn - synchronous position change (no smooth scroll)
 * @param {{ fadeMs?: number, holdMs?: number }} [opts]
 */
/**
 * @param {() => void} jumpFn
 * @param {{ fadeMs?: number, holdMs?: number, alreadyVeiled?: boolean }} [opts]
 */
export function fadeTo(jumpFn, opts = {}) {
  const fadeMs = opts.fadeMs ?? 560;
  const holdMs = opts.holdMs ?? 220;
  const veil = ensureVeil();
  const already = opts.alreadyVeiled || veil.classList.contains("is-visible");

  if (prefersReduced()) {
    jumpFn();
    veil.classList.remove("is-on", "is-visible", "is-out");
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const afterJump = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            veil.classList.remove("is-visible");
            veil.classList.add("is-out");
            window.setTimeout(() => {
              veil.classList.remove("is-on", "is-out");
              resolve();
            }, fadeMs + 80);
          }, holdMs);
        });
      });
    };

    if (already) {
      jumpFn();
      afterJump();
      return;
    }

    veil.classList.remove("is-out");
    veil.classList.add("is-on");
    void veil.offsetWidth;
    veil.classList.add("is-visible");

    window.setTimeout(() => {
      jumpFn();
      afterJump();
    }, fadeMs);
  });
}

/**
 * Instant scroll to element (no smooth, no browser animation).
 */
export function jumpToElement(el, { offset = 0 } = {}) {
  if (!el) return false;
  const top =
    el.getBoundingClientRect().top + window.scrollY - offset;
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, Math.max(0, top));
  html.style.scrollBehavior = prev;
  return true;
}

function readCssTime(name, fallbackMs) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const n = parseFloat(raw);
  if (raw.endsWith("ms")) return n || fallbackMs;
  if (raw.endsWith("s")) return (n || fallbackMs / 1000) * 1000;
  return fallbackMs;
}

function easeFromVar(name, fallbackName) {
  const style = getComputedStyle(document.documentElement);
  const raw =
    style.getPropertyValue(name).trim() ||
    style.getPropertyValue(fallbackName).trim();
  const m = raw.match(
    /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/
  );
  if (!m) return (t) => t;
  const x1 = +m[1], y1 = +m[2], x2 = +m[3], y2 = +m[4];
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const z = sampleX(t) - x;
      if (Math.abs(z) < 1e-6) break;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= z / d;
    }
    return sampleY(t);
  };
}

let glideRaf = 0;

/**
 * Calm in-page slide to an element. Uses --chapter-dur / --chapter-ease.
 * @param {Element|null} el
 * @param {{ offset?: number }} [opts]
 * @returns {Promise<void>}
 */
export function glideToElement(el, { offset = 0 } = {}) {
  if (!el) return Promise.resolve();
  const to = Math.max(
    0,
    el.getBoundingClientRect().top + window.scrollY - offset
  );
  return glideToY(to);
}

/**
 * @param {number} toY
 * @returns {Promise<void>}
 */
export function glideToY(toY) {
  if (glideRaf) {
    cancelAnimationFrame(glideRaf);
    glideRaf = 0;
  }
  const fromY = window.scrollY;
  const dest = Math.max(0, toY);
  if (prefersReduced() || Math.abs(dest - fromY) < 0.5) {
    window.scrollTo(0, dest);
    return Promise.resolve();
  }
  const dur = readCssTime("--chapter-dur", 1200);
  const ease = easeFromVar("--chapter-ease", "--mask-ease");
  const t0 = performance.now();
  return new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, fromY + (dest - fromY) * ease(t));
      if (t < 1) {
        glideRaf = requestAnimationFrame(tick);
      } else {
        window.scrollTo(0, dest);
        glideRaf = 0;
        resolve();
      }
    };
    glideRaf = requestAnimationFrame(tick);
  });
}
