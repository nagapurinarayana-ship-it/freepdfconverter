(function () {
  "use strict";

  if (typeof Uint8Array.prototype.toHex !== "function") {
    Object.defineProperty(Uint8Array.prototype, "toHex", {
      configurable: true,
      value: function () {
        return Array.prototype.map.call(this, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
      }
    });
  }
  if (typeof Promise.withResolvers !== "function") {
    Promise.withResolvers = function () {
      var resolve; var reject;
      var promise = new Promise(function (res, rej) { resolve = res; reject = rej; });
      return { promise: promise, resolve: resolve, reject: reject };
    };
  }
  if (typeof URL.parse !== "function") {
    URL.parse = function (value, base) {
      try { return new URL(value, base); } catch { return null; }
    };
  }

  var KB = 1024;
  var MB = KB * 1024;
  var GB = MB * 1024;

  function formatBytes(bytes) {
    var value = Number(bytes) || 0;
    if (value < KB) return value + " B";
    if (value < MB) return (value / KB).toFixed(1) + " KB";
    if (value < GB) return (value / MB).toFixed(1) + " MB";
    return (value / GB).toFixed(2) + " GB";
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function safeBaseName(filename) {
    var base = String(filename || "document").replace(/\.[^.]+$/, "");
    base = base.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    return base || "document";
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  function isPdf(file) {
    return file instanceof File && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
  }

  function isImage(file) {
    return file instanceof File && (/^image\/(jpeg|png)$/i.test(file.type) || /\.(jpe?g|png)$/i.test(file.name));
  }

  function totalSize(files) {
    return files.reduce(function (sum, file) { return sum + Number(file.size || 0); }, 0);
  }

  function setStatus(element, message, type) {
    element.textContent = message;
    element.dataset.type = type || "info";
  }

  function setProgress(element, value) {
    element.style.width = Math.max(0, Math.min(100, Number(value) || 0)) + "%";
  }

  function bindDropZone(zone, input, onFiles) {
    ["dragenter", "dragover"].forEach(function (name) {
      zone.addEventListener(name, function (event) {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach(function (name) {
      zone.addEventListener(name, function (event) {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.remove("is-dragging");
      });
    });
    zone.addEventListener("drop", function (event) {
      onFiles(event.dataTransfer.files);
    });
    input.addEventListener("change", function () {
      onFiles(input.files);
      input.value = "";
    });
  }

  function hexToRgb(hex) {
    var match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ""));
    if (!match) return { r: 0.12, g: 0.24, b: 0.45 };
    return {
      r: parseInt(match[1], 16) / 255,
      g: parseInt(match[2], 16) / 255,
      b: parseInt(match[3], 16) / 255
    };
  }

  function appendPopularSearches() {
    if (document.querySelector("[data-popular-pdf-searches]")) return;
    var path = window.location.pathname;
    var groups = {
      organize: [
        ["/tools/merge-pdf", "merge PDF online free"],
        ["/tools/split-pdf", "split PDF online"],
        ["/tools/organize-pdf", "reorder or delete PDF pages"],
        ["/tools/rotate-pdf", "rotate PDF pages"],
        ["/tools/add-page-numbers", "add page numbers to PDF"]
      ],
      convert: [
        ["/tools/jpg-to-pdf", "JPG to PDF converter"],
        ["/tools/pdf-to-image", "PDF to JPG or PNG"],
        ["/tools/extract-pdf-text", "extract text from PDF"],
        ["/guides/pdf-to-jpg-vs-png", "PDF to JPG vs PNG"],
        ["/guides/jpg-png-to-pdf", "convert images to PDF"]
      ],
      privacy: [
        ["/tools/unlock-pdf", "unlock PDF with known password"],
        ["/tools/remove-pdf-metadata", "remove PDF metadata"],
        ["/guides/pdf-converter-without-upload", "PDF converter without upload"],
        ["/guides/are-online-pdf-converters-safe", "are online PDF converters safe"],
        ["/how-local-processing", "private browser PDF processing"]
      ],
      default: [
        ["/tools/merge-pdf", "free merge PDF online"],
        ["/tools/split-pdf", "free split PDF online"],
        ["/tools/unlock-pdf", "unlock PDF online"],
        ["/tools/jpg-to-pdf", "JPG to PDF converter"],
        ["/tools/pdf-to-image", "PDF to JPG converter"],
        ["/tools/organize-pdf", "organize PDF pages"],
        ["/guides/reduce-pdf-file-size-for-email", "PDF too large for email"],
        ["/guides/pdf-converter-without-upload", "PDF tools without upload"]
      ]
    };
    var list = /merge|split|organize|rotate|page-numbers/.test(path) ? groups.organize : /jpg|image|extract-text/.test(path) ? groups.convert : /unlock|metadata|safe|without-upload|local-processing/.test(path) ? groups.privacy : groups.default;
    var section = document.createElement("section");
    section.dataset.popularPdfSearches = "1";
    section.setAttribute("aria-labelledby", "popular-pdf-searches-title");
    section.style.cssText = "max-width:1120px;margin:36px auto;padding:0 20px";
    section.innerHTML = '<div style="border:1px solid #dfe6f2;border-radius:18px;background:#f8fbff;padding:22px"><span style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1f67ff">Popular PDF searches</span><h2 id="popular-pdf-searches-title" style="margin:8px 0 8px;font-size:24px">Related free PDF tools and guides</h2><p style="margin:0 0 14px;color:#536174;line-height:1.6">Choose the exact task you need. FreePDF Tools focuses on browser-based workflows with no account and no document upload for supported operations.</p><nav aria-label="Popular PDF searches" style="display:flex;flex-wrap:wrap;gap:9px">' + list.map(function (item) { return '<a href="' + item[0] + '" style="display:inline-block;border:1px solid #d7e2f3;background:white;border-radius:999px;padding:8px 12px;color:#174fae;text-decoration:none;font-weight:700;font-size:14px">' + item[1] + '</a>'; }).join("") + '</nav></div>';
    var footer = document.querySelector("footer");
    if (footer && footer.parentNode) footer.parentNode.insertBefore(section, footer);
    else document.body.appendChild(section);
  }

  window.FreePDF = Object.freeze({
    MB: MB,
    formatBytes: formatBytes,
    createId: createId,
    safeBaseName: safeBaseName,
    downloadBlob: downloadBlob,
    isPdf: isPdf,
    isImage: isImage,
    totalSize: totalSize,
    setStatus: setStatus,
    setProgress: setProgress,
    bindDropZone: bindDropZone,
    hexToRgb: hexToRgb
  });

  document.querySelectorAll("[data-current-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", appendPopularSearches, { once: true });
  else appendPopularSearches();

  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/service-worker.js").catch(function () {
        /* The tools still work normally if service-worker registration is unavailable. */
      });
    });
  }
}());
