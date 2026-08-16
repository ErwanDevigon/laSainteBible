/** Gospel pickers — a name is a link to chapter 1. */

export const GOSPEL_META = [
  { id: "matthieu", label: "Matthieu", short: "Mt", chapters: 28 },
  { id: "marc", label: "Marc", short: "Mc", chapters: 16 },
  { id: "luc", label: "Luc", short: "Lc", chapters: 24 },
  { id: "jean", label: "Jean", short: "Jn", chapters: 21 },
];

/**
 * @param {HTMLElement} container
 * @param {{ basePath?: string, mode?: 'cards'|'compact' }} [opts]
 */
export function mountGospelPickers(container, opts = {}) {
  if (!container) return;
  const base = opts.basePath ?? "";
  const mode = opts.mode ?? "cards";
  container.replaceChildren();
  container.classList.add(
    mode === "compact" ? "gospel-picks" : "choose-grid"
  );

  for (const book of GOSPEL_META) {
    const href = `${base}${book.id}.html#c1`;
    const a = document.createElement("a");
    a.href = href;

    if (mode === "compact") {
      a.className = "gospel-pick-name";
      a.textContent = book.label;
    } else {
      a.className = "choose-card";
      const title = document.createElement("h2");
      title.textContent = book.label;
      a.appendChild(title);
    }

    container.appendChild(a);
  }
}
