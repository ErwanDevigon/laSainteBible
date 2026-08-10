import { mountGospelPickers } from "./nav-books.js";

const root = document.querySelector("[data-gospel-pickers]");
if (root) {
  mountGospelPickers(root, { basePath: "", mode: "cards" });
}
