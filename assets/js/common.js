(function () {
  "use strict";

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
}());
