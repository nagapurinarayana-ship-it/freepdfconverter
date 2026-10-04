import { mount } from "/assets/js/tools/photo-compressor.tool.js";

function start() {
  if (!window.FreePDF || typeof window.FreePDF.bindDropZone !== "function") {
    throw new Error("FreePDF common runtime is not ready");
  }
  mount();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
