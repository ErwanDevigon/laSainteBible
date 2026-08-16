import { mountGospelPickers } from "./nav-books.js";
import { mountSwipeNav } from "./swipe-nav.js";

mountSwipeNav();

const root = document.querySelector("[data-gospel-pickers]");
if (root) {
  const inLire = /\/lire(\/|$)/.test(window.location.pathname);
  mountGospelPickers(root, {
    basePath: inLire ? "" : "lire/",
    mode: "cards",
  });
}
