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

  function isFileLike(file) {
    return Boolean(file && typeof file.name === "string" && Number.isFinite(Number(file.size)));
  }

  function isPdf(file) {
    return isFileLike(file) && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
  }

  function isImage(file) {
    return isFileLike(file) && (/^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name));
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
      onFiles(Array.from(event.dataTransfer.files || []));
    });
    bindFileInput(input, onFiles);
  }

  function bindFileInput(input, onFiles) {
    var handled = false;
    var retryDelays = [0, 40, 120, 300, 600];
    var pickerRecoveryEnabled = input.hasAttribute("data-new-tool-picker");
    var recoveryTimer = null;
    var recoveryStartedAt = 0;

    function readSelection() {
      return Array.from(input.files || []);
    }

    function resetInput() {
      try { input.value = ""; } catch (_) { /* Some browsers make file inputs immutable. */ }
    }

    function consume(files) {
      if (handled || !files.length) return false;
      handled = true;

      try {
        return Promise.resolve(onFiles(files)).finally(function () {
          window.setTimeout(resetInput, 0);
        });
      } catch (error) {
        resetInput();
        throw error;
      }
    }

    function stopRecovery() {
      if (recoveryTimer) {
        window.clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
    }

    function startRecovery() {
      if (!pickerRecoveryEnabled) return;

      stopRecovery();
      if (handled) return;

      recoveryStartedAt = Date.now();

      function probe() {
        recoveryTimer = null;
        if (handled) return;

        var files = readSelection();
        if (files.length) {
          consume(files);
          return;
        }

        // Android can return from the media picker without dispatching change.
        // Keep probing for a full 10 seconds after focus/visibility returns.
        if (Date.now() - recoveryStartedAt < 10000) {
          recoveryTimer = window.setTimeout(probe, 100);
        }
      }

      probe();
    }

    input.addEventListener("click", function () {
      handled = false;
      stopRecovery();
      // Start recovery before the native picker opens. Android Chrome can
      // return from the picker without emitting change/focus/visibility events.
      // The timer resumes with the page and reads input.files directly.
      if (pickerRecoveryEnabled) startRecovery();
    });

    if (pickerRecoveryEnabled) {
      window.addEventListener("focus", startRecovery);
      window.addEventListener("pageshow", startRecovery);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") startRecovery();
      });
    }

    input.addEventListener("change", function () {
      handled = false;
      stopRecovery();
      retryDelays.forEach(function (delay) {
        window.setTimeout(function () {
          consume(readSelection());
        }, delay);
      });
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
  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/service-worker.js").catch(function () {
        /* The tools still work normally if service-worker registration is unavailable. */
      });
    });
  }
}());