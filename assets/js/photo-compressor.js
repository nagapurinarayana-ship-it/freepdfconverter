(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 25 * U.MB;
  var file = null;
  var image = null;
  var busy = false;
  var el = {
    zone: document.getElementById("dropZone"),
    input: document.getElementById("imageFile"),
    summary: document.getElementById("fileSummary"),
    target: document.getElementById("targetSize"),
    width: document.getElementById("maxWidth"),
    format: document.getElementById("outputFormat"),
    compress: document.getElementById("compressButton"),
    clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus"),
    originalSize: document.getElementById("originalSize"),
    outputSize: document.getElementById("outputSize"),
    dimensions: document.getElementById("dimensions")
  };

  function update() {
    el.summary.textContent = file ? file.name + " · " + U.formatBytes(file.size) : "No image selected";
    el.originalSize.textContent = file ? U.formatBytes(file.size) : "—";
    el.compress.disabled = busy || !file || !image;
    el.clear.disabled = busy || !file;
    el.input.disabled = busy;
  }

  function reset() {
    if (busy) return;
    file = null;
    image = null;
    el.input.value = "";
    el.originalSize.textContent = "—";
    el.outputSize.textContent = "—";
    el.dimensions.textContent = "—";
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose a JPG, PNG or WebP image. Processing stays in your browser.", "info");
    update();
  }

  function loadImage(next) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(next);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("image-load-failed")); };
      img.src = url;
    });
  }

  async function select(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0];
    if (!next) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(next.type)) return U.setStatus(el.status, "Choose a JPG, PNG or WebP image.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the image below 25 MB for browser stability.", "error");
    try {
      file = next;
      image = await loadImage(next);
      el.dimensions.textContent = image.naturalWidth + " × " + image.naturalHeight + " px";
      el.outputSize.textContent = "—";
      U.setStatus(el.status, "Ready. Choose a target size and export format.", "success");
      update();
    } catch (error) {
      reset();
      U.setStatus(el.status, "The image could not be read by your browser.", "error");
    }
  }

  function canvasFor(maxWidth) {
    var scale = Math.min(1, maxWidth / image.naturalWidth);
    var width = Math.max(1, Math.round(image.naturalWidth * scale));
    var height = Math.max(1, Math.round(image.naturalHeight * scale));
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d", { alpha: el.format.value === "image/png" });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (el.format.value === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  }

  function blobFromCanvas(canvas, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, el.format.value, quality);
    });
  }

  async function findBestBlob(targetBytes, maxWidth) {
    var canvas = canvasFor(maxWidth);
    var format = el.format.value;
    if (format === "image/png") {
      var png = await blobFromCanvas(canvas);
      if (png.size <= targetBytes) return png;
      return png;
    }

    var best = null;
    var low = 0.1;
    var high = 0.95;
    for (var i = 0; i < 9; i += 1) {
      var quality = (low + high) / 2;
      var blob = await blobFromCanvas(canvas, quality);
      if (!best || Math.abs(blob.size - targetBytes) < Math.abs(best.size - targetBytes)) best = blob;
      if (blob.size > targetBytes) high = quality;
      else low = quality;
    }
    return best;
  }

  async function compress() {
    if (busy || !file || !image) return;
    busy = true;
    update();
    try {
      var targetKB = Math.max(5, Number(el.target.value || 200));
      var targetBytes = targetKB * 1024;
      var maxWidth = Math.max(100, Number(el.width.value || 1600));
      U.setProgress(el.progress, 10);
      U.setStatus(el.status, "Creating a browser-local optimized copy…", "info");

      var best = await findBestBlob(targetBytes, maxWidth);
      U.setProgress(el.progress, 65);

      // If the first pass is still too large, progressively reduce dimensions.
      var attempts = 0;
      while (best && best.size > targetBytes && maxWidth > 400 && attempts < 5 && el.format.value !== "image/png") {
        maxWidth = Math.round(maxWidth * 0.82);
        best = await findBestBlob(targetBytes, maxWidth);
        attempts += 1;
        U.setProgress(el.progress, 65 + attempts * 6);
      }

      if (!best) throw new Error("encode-failed");
      el.outputSize.textContent = U.formatBytes(best.size);
      var reduction = file.size > 0 ? Math.max(0, (file.size - best.size) / file.size * 100) : 0;
      var ext = el.format.value === "image/png" ? "png" : el.format.value === "image/webp" ? "webp" : "jpg";
      U.downloadBlob(best, U.safeBaseName(file.name) + "-compressed." + ext);
      U.setProgress(el.progress, 100);
      var targetMessage = best.size <= targetBytes ? "Target met." : "The smallest browser result was above the target; no extreme quality loss was forced.";
      U.setStatus(el.status, "Done — " + U.formatBytes(file.size) + " → " + U.formatBytes(best.size) + " (" + reduction.toFixed(1) + "% smaller). " + targetMessage, "success");
    } catch (error) {
      U.setProgress(el.progress, 0);
      U.setStatus(el.status, "The image could not be compressed in your browser.", "error");
    } finally {
      busy = false;
      update();
    }
  }

  U.bindDropZone(el.zone, el.input, select);
  el.compress.addEventListener("click", compress);
  el.clear.addEventListener("click", reset);
  reset();
}());
