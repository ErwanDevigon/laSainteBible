/**
 * LMB grab-pan (phone-like). Same page. Content follows the pointer.
 * Vertical = document scroll. Horizontal = slide on a wider virtual stage;
 * release keeps the offset (empty space is valid). No page change.
 * MMB = classic LMB text selection (no autoscroll).
 */

const SLOP = 8;
const IGNORE =
  "input, textarea, select, option, button, a, .edition-name-bar, .active-edition-bar, .book-title-bar, .chapter-rail, .edition-menu, .parallels-menu, .testament-bar, .site-header, .reader-chrome, .parallels-toggle, .parallels-toggle-btn, .parallel-rail, .parallel-stamp";

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

function closestCol(node) {
  const el = node?.nodeType === 1 ? node : node?.parentElement;
  return el?.closest("[data-col]")?.dataset.col || "";
}

function markSelectCol(col) {
  document.querySelectorAll(".chapter-pair .verse").forEach((el) => {
    el.classList.toggle("is-select-col", !!col && el.dataset.col === col);
  });
}

function trimSelectionToCol(col) {
  if (!col) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const startCol = closestCol(range.startContainer);
  const endCol = closestCol(range.endContainer);
  if (startCol === col && endCol === col) return;
  try {
    if (startCol !== col && endCol !== col) {
      sel.removeAllRanges();
      return;
    }
    if (startCol !== col) {
      const verse = range.endContainer.nodeType === 1
        ? range.endContainer.closest(".verse")
        : range.endContainer.parentElement?.closest(".verse");
      if (!verse || verse.dataset.col !== col) {
        sel.removeAllRanges();
        return;
      }
      range.setStart(verse, 0);
    }
    if (endCol !== col) {
      const verse = range.startContainer.nodeType === 1
        ? range.startContainer.closest(".verse")
        : range.startContainer.parentElement?.closest(".verse");
      if (!verse || verse.dataset.col !== col) {
        sel.removeAllRanges();
        return;
      }
      range.setEnd(verse, verse.childNodes.length);
    }
  } catch {
    /* ignore */
  }
}

function caretInCol(x, y, col) {
  const hit = document.elementFromPoint(x, y);
  const verse = hit?.closest?.(".verse");
  if (verse?.dataset.col === col) return caretAt(x, y);
  const pair = verse?.closest(".chapter-pair") || hit?.closest?.(".chapter-pair");
  if (!pair || !col) return null;
  const n = verse?.dataset.verse;
  const home = n
    ? pair.querySelector(`.verse[data-col="${CSS.escape(col)}"][data-verse="${n}"]`)
    : pair.querySelector(`.verse[data-col="${CSS.escape(col)}"]`);
  if (!home) return null;
  const r = home.getBoundingClientRect();
  const x2 = Math.min(Math.max(x, r.left + 2), r.right - 2);
  return caretAt(x2, y);
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
    const col = closestCol(pos.node);
    markSelectCol(col);
    const range = document.createRange();
    range.setStart(pos.node, pos.offset);
    range.collapse(true);
    sel.addRange(range);
    anchor = { ...pos, col };
  }

  function onMouseMove(e) {
    if (e.buttons !== 4 || !anchor) return;
    e.preventDefault();
    const pos = caretInCol(e.clientX, e.clientY, anchor.col) || caretAt(e.clientX, e.clientY);
    if (!pos) return;
    if (anchor.col && closestCol(pos.node) !== anchor.col) return;
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

  function stepPx() {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;width:var(--edition-step);pointer-events:none";
    root.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    if (w > 8) return w;
    const sample =
      root.querySelector(".parallel-card") ||
      root.querySelector(".reading-card") ||
      root.querySelector(".edition-name-stage p");
    if (sample) {
      const gap = 1.65 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
      return sample.getBoundingClientRect().width + gap;
    }
    return Math.max(240, window.innerWidth * 0.42);
  }

  function onKey(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (sess) return;
    const t = e.target;
    if (
      t instanceof Element &&
      t.closest("input, textarea, select, option, [contenteditable='true']")
    ) {
      return;
    }
    if (document.querySelector(".edition-menu, .parallels-menu")) return;
    e.preventDefault();
    const delta = e.key === "ArrowLeft" ? stepPx() : -stepPx();
    const next = readX(root) + delta;
    root.dataset.swipeBase = String(next);
    setX(next);
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

  function onPointerDownSelect(e) {
    const v = e.target.closest(".chapter-pair .verse");
    markSelectCol(v?.dataset.col || "");
  }

  function onSelectStart(e) {
    if (e.target.closest(".chapter-rail, .edition-menu, .parallels-menu")) {
      e.preventDefault();
      return;
    }
    const verse = e.target.closest(".chapter-pair .verse");
    if (verse && !verse.classList.contains("is-select-col")) {
      e.preventDefault();
    }
  }

  function onSelectionChange() {
    const marked = document.querySelector(".chapter-pair .verse.is-select-col");
    if (!marked) return;
    trimSelectionToCol(marked.dataset.col);
  }

  function onDragStart(e) {
    e.preventDefault();
  }

  function onResize() {
    setProgress(root, readX(root));
  }

  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerdown", onPointerDownSelect, true);
  root.addEventListener("click", onClickCapture, true);
  root.addEventListener("selectstart", onSelectStart);
  root.addEventListener("dragstart", onDragStart);
  document.addEventListener("selectionchange", onSelectionChange);
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKey);

  return () => {
    unbindWindow();
    unbindMmb();
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("pointerdown", onPointerDownSelect, true);
    root.removeEventListener("click", onClickCapture, true);
    root.removeEventListener("selectstart", onSelectStart);
    root.removeEventListener("dragstart", onDragStart);
    document.removeEventListener("selectionchange", onSelectionChange);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("keydown", onKey);
    root.classList.remove("is-swiping");
    root.style.removeProperty("--swipe-x");
    root.style.removeProperty("--swipe-p");
    delete root.dataset.swipeReveal;
  };
}
