/**
 * LMB grab-pan (phone-like). Same page. Content follows the pointer.
 * Vertical = document scroll. Horizontal = slide on a wider virtual stage;
 * release keeps the offset (empty space is valid). No page change.
 */

const SLOP = 8;
const IGNORE = "input, textarea, select, option";

function readX(root) {
  return parseFloat(root.style.getPropertyValue("--swipe-x")) || 0;
}

/**
 * @param {HTMLElement} [root]
 * @returns {() => void} dispose
 */
export function bindGrabPan(root = document.body) {
  let sess = null;
  let blockClick = false;

  function setX(px) {
    root.style.setProperty("--swipe-x", `${px}px`);
  }

  function unbindWindow() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  }

  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (sess) return;
    if (e.target.closest(IGNORE)) return;

    sess = {
      id: e.pointerId,
      type: e.pointerType,
      x0: e.clientX,
      y0: e.clientY,
      xBase: readX(root),
      scrollY0: window.scrollY,
      dragging: false,
      axis: null,
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function abortNative() {
    sess = null;
    unbindWindow();
    root.classList.remove("is-swiping");
  }

  function onMove(e) {
    if (!sess || e.pointerId !== sess.id) return;

    const dx = e.clientX - sess.x0;
    const dy = e.clientY - sess.y0;

    if (!sess.dragging) {
      if (dx * dx + dy * dy < SLOP * SLOP) return;
      sess.dragging = true;
      sess.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (sess.axis === "y" && sess.type !== "mouse") {
        abortNative();
        return;
      }
      root.classList.add("is-swiping");
      window.getSelection()?.removeAllRanges();
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    e.preventDefault();
    if (sess.axis === "y") {
      window.scrollTo(0, sess.scrollY0 - dy);
    } else {
      window.scrollTo(0, sess.scrollY0);
      setX(sess.xBase + dx);
    }
  }

  function onUp(e) {
    if (!sess || e.pointerId !== sess.id) return;
    const dragged = sess.dragging;
    sess = null;
    unbindWindow();
    root.classList.remove("is-swiping");

    if (!dragged) return;

    blockClick = true;
    window.setTimeout(() => {
      blockClick = false;
    }, 0);
  }

  function onClickCapture(e) {
    if (!blockClick) return;
    e.preventDefault();
    e.stopPropagation();
    blockClick = false;
  }

  function onSelectStart(e) {
    e.preventDefault();
  }

  function onDragStart(e) {
    e.preventDefault();
  }

  root.addEventListener("pointerdown", onDown);
  root.addEventListener("click", onClickCapture, true);
  root.addEventListener("selectstart", onSelectStart);
  root.addEventListener("dragstart", onDragStart);

  return () => {
    unbindWindow();
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("click", onClickCapture, true);
    root.removeEventListener("selectstart", onSelectStart);
    root.removeEventListener("dragstart", onDragStart);
    root.classList.remove("is-swiping");
    root.style.removeProperty("--swipe-x");
  };
}
