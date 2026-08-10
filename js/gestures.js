/**
 * Horizontal swipe / drag detector (touch + mouse).
 * Ignores vertical scroll and interactive controls.
 */

/**
 * @param {HTMLElement} target
 * @param {{
 *   onSwipeLeft?: () => void,
 *   onSwipeRight?: () => void,
 *   threshold?: number,
 *   restraint?: number,
 *   allowedTime?: number
 * }} handlers
 * @returns {() => void} dispose
 */
export function bindSwipe(target, handlers = {}) {
  const threshold = handlers.threshold ?? 48;
  const restraint = handlers.restraint ?? 90;
  const allowedTime = handlers.allowedTime ?? 1200;

  let startX = 0;
  let startY = 0;
  let startT = 0;
  let tracking = false;
  let pointerId = null;
  let didSwipe = false;

  const IGNORE =
    'a, button, input, textarea, select, label, option, [data-expandable="true"], .reading-card, .gospel-pick, .chapter-pick';

  function clearWindowListeners() {
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
  }

  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest(IGNORE)) return;

    tracking = true;
    didSwipe = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startT = Date.now();

    // Capture only for touch — mouse capture steals click from children
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    } else {
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onCancel, { passive: true });
    }
  }

  function finish(e) {
    if (!tracking || e.pointerId !== pointerId) return;
    tracking = false;
    pointerId = null;
    clearWindowListeners();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dt = Date.now() - startT;

    if (dt > allowedTime) return;
    if (Math.abs(dx) < threshold) return;
    if (Math.abs(dy) > restraint) return;
    if (Math.abs(dy) > Math.abs(dx) * 0.75) return;

    didSwipe = true;
    if (dx < 0) handlers.onSwipeLeft?.();
    else handlers.onSwipeRight?.();
  }

  function onUp(e) {
    finish(e);
  }

  function onCancel(e) {
    if (e.pointerId !== pointerId) return;
    tracking = false;
    pointerId = null;
    clearWindowListeners();
  }

  // Prevent residual click after a successful mouse drag-swipe
  function onClickCapture(e) {
    if (didSwipe) {
      e.preventDefault();
      e.stopPropagation();
      didSwipe = false;
    }
  }

  target.addEventListener("pointerdown", onDown, { passive: true });
  target.addEventListener("pointerup", onUp, { passive: true });
  target.addEventListener("pointercancel", onCancel, { passive: true });
  target.addEventListener("click", onClickCapture, true);

  return () => {
    clearWindowListeners();
    target.removeEventListener("pointerdown", onDown);
    target.removeEventListener("pointerup", onUp);
    target.removeEventListener("pointercancel", onCancel);
    target.removeEventListener("click", onClickCapture, true);
  };
}
