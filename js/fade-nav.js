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
