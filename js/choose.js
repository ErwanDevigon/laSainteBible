import { mountCanonCatalog, mountTestamentBar } from "./nav-books.js";
import { mountSwipeNav } from "./swipe-nav.js";
import {
  mountSiteEditionBar,
  getActiveEdition,
  EDITION_STACK,
} from "./editions.js";
import { listVersionIds, loadVersionIndex } from "./data-loader.js";

const TESTAMENT_KEY = "lsb-testament";

function readTestament() {
  try {
    const v = sessionStorage.getItem(TESTAMENT_KEY);
    if (v === "at" || v === "nt") return v;
  } catch {
    /* ignore */
  }
  return "at";
}

function writeTestament(v) {
  try {
    sessionStorage.setItem(TESTAMENT_KEY, v);
  } catch {
    /* ignore */
  }
}

async function paint() {
  const available = await listVersionIds();
  const pool = available.length ? available : EDITION_STACK;
  const versionId = getActiveEdition(pool);
  mountSiteEditionBar(pool);

  const root = document.querySelector("[data-gospel-pickers]");
  const inLire = /\/lire(\/|$)/.test(window.location.pathname);
  const base = inLire ? "" : "lire/";

  let testament = readTestament();
  const index = await loadVersionIndex(versionId);
  const hasAt = index?.books?.some((b) => b.testament === "at");
  const hasNt = index?.books?.some((b) => b.testament === "nt");
  if (testament === "at" && !hasAt && hasNt) testament = "nt";
  if (testament === "nt" && !hasNt && hasAt) testament = "at";

  mountTestamentBar(versionId, testament, (next) => {
    writeTestament(next);
    paint();
  });

  if (!root) return;
  await mountCanonCatalog(root, {
    base,
    versionId,
    testament,
    index,
  });
}

mountSwipeNav();
paint();

document.addEventListener("lsb:editions", () => {
  paint();
});
