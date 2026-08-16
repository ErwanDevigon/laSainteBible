import { mountGospelPickers } from "./nav-books.js";
import { mountSwipeNav } from "./swipe-nav.js";
import { mountSiteEditionBar } from "./editions.js";

mountSwipeNav();
mountSiteEditionBar();

document.addEventListener("lsb:editions", () => {
  mountSiteEditionBar();
});

const root = document.querySelector("[data-gospel-pickers]");
if (root) {
  const inLire = /\/lire(\/|$)/.test(window.location.pathname);
  mountGospelPickers(root, {
    basePath: inLire ? "" : "lire/",
    mode: "canon",
  });
}
