/**
 * LMB grab-pan (phone-like). Same page. Content follows the pointer.
 * Vertical = document scroll. Horizontal = slide on a wider virtual stage;
 * release keeps the offset (empty space is valid). No page change.
 * MMB = classic LMB text selection (no autoscroll).
 */

const SLOP = 8;
const IGNORE =
  "input, textarea, select, option, button, a, .edition-name-bar, .active-edition-bar, .book-title-bar, .chapter-rail, .edition-menu, .testament-bar, .site-header";

function readX(root) {
  return parseFloat(root.style.getPropertyValue("--swipe-x")) || 0;
}

function setProgress(root, px) {
  const w = Math.max(1, window.innerWidth);
  const p = Math.max(0, Math.min(1, px / w));
  root.style.setProperty("--swipe-p", p.toFixed(4));
  if (p > 0.5) root.dataset.swipeReveal = "left";
  else delete root.dataset.swipeReveal;
  const neighbor = root.querySelector(".edition-pane.is-neighbor");
  if (neighbor) neighbor.setAttribute("aria-hidden", p > 0.15 ? "false" : "true");
}

function caretAt(x, y) {
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p?.offsetNode) return { node: p.offsetNode, offset: p.offset };
  }
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r?.startContainer) return { node: r.startContainer, offset: r.startOffset };
  }
  return null;
}

function bindMmbSelect(root) {
  let anchor = null;

  function onMouseDown(e) {
    if (e.button !== 1) return;
    e.preventDefault();
    const pos = caretAt(e.clientX, e.clientY);
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (!pos) {
      anchor = null;
      return;
    }
    const range = document.createRange();
    range.setStart(pos.node, pos.offset);
    range.collapse(true);
    sel.addRange(range);
    anchor = pos;
  }

  function onMouseMove(e) {
    if (e.buttons !== 4 || !anchor) return;
    e.preventDefault();
    const pos = caretAt(e.clientX, e.clientY);
    if (!pos) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    try {
      sel.extend(pos.node, pos.offset);
    } catch {
      /* ignore */
    }
  }

  function onMouseUp(e) {
    if (e.button === 1) anchor = null;
  }

  function onAuxClick(e) {
    if (e.button === 1) e.preventDefault();
  }

  root.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  root.addEventListener("auxclick", onAuxClick);

  return () => {
    root.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    root.removeEventListener("auxclick", onAuxClick);
  };
}

/**
 * @param {HTMLElement} [root]
 * @returns {() => void} dispose
 */
export function bindGrabPan(root = document.body) {
  let sess = null;
  let blockClick = false;
  const unbindMmb = bindMmbSelect(root);

  function setX(px) {
    root.style.setProperty("--swipe-x", `${px}px`);
    setProgress(root, px);
    root.dispatchEvent(new CustomEvent("lsb:pan", { detail: { x: px } }));
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

    const xBase = readX(root);
    root.dataset.swipeBase = String(xBase);
    sess = {
      id: e.pointerId,
      type: e.pointerType,
      x0: e.clientX,
      y0: e.clientY,
      xBase,
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
      const base = parseFloat(root.dataset.swipeBase);
      setX((Number.isFinite(base) ? base : sess.xBase) + dx);
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
    if (
      e.target.closest(
        ".site-header, .book-title-bar, .edition-name-bar, .active-edition-bar, .chapter-rail, .edition-menu, .testament-bar"
      )
    ) {
      e.preventDefault();
    }
  }

  function onDragStart(e) {
    e.preventDefault();
  }

  function onResize() {
    setProgress(root, readX(root));
  }

  root.addEventListener("pointerdown", onDown);
  root.addEventListener("click", onClickCapture, true);
  root.addEventListener("selectstart", onSelectStart);
  root.addEventListener("dragstart", onDragStart);
  window.addEventListener("resize", onResize);

  return () => {
    unbindWindow();
    unbindMmb();
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("click", onClickCapture, true);
    root.removeEventListener("selectstart", onSelectStart);
    root.removeEventListener("dragstart", onDragStart);
    window.removeEventListener("resize", onResize);
    root.classList.remove("is-swiping");
    root.style.removeProperty("--swipe-x");
    root.style.removeProperty("--swipe-p");
    delete root.dataset.swipeReveal;
  };
}
