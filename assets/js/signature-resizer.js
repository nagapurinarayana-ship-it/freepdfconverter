(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 15 * U.MB;
  var file = null;
  var image = null;
  var busy = false;
  var el = {
    zone: document.getElementById("dropZone"),
    input: document.getElementById("signatureFile"),
    summary: document.getElementById("fileSummary"),
    width: document.getElementById("signatureWidth"),
    height: document.getElementById("signatureHeight"),
    target: document.getElementById("targetSize"),
    background: document.getElementById("backgroundMode"),
    format: document.getElementById("outputFormat"),
    process: document.getElementById("processButton"),
    clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus"),
    originalSize: document.getElementById("originalSize"),
    outputSize: document.getElementById("outputSize")
  };

  function update() {
    el.summary.textContent = file ? file.name + " · " + U.formatBytes(file.size) : "No signature image selected";
    el.originalSize.textContent = file ? U.formatBytes(file.size) : "—";
    el.process.disabled = busy || !file || !image;
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
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose a signature photo. You can resize it, clean a white background and keep the output under a target size.", "info");
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
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the signature image below 15 MB.", "error");
    try {
      file = next;
      image = await loadImage(next);
      el.outputSize.textContent = "—";
      U.setStatus(el.status, "Ready to create a clean signature image.", "success");
      update();
    } catch (error) {
      reset();
      U.setStatus(el.status, "The signature image could not be read.", "error");
    }
  }

  function buildCanvas() {
    var width = Math.max(50, Number(el.width.value || 600));
    var height = Math.max(30, Number(el.height.value || 200));
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var transparent = el.background.value === "transparent";
    var ctx = canvas.getContext("2d", { alpha: transparent });
    if (!transparent) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    var scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    var drawW = Math.max(1, Math.round(image.naturalWidth * scale));
    var drawH = Math.max(1, Math.round(image.naturalHeight * scale));
    var x = Math.round((width - drawW) / 2);
    var y = Math.round((height - drawH) / 2);
    ctx.drawImage(image, x, y, drawW, drawH);

    if (transparent) {
      var pixels = ctx.getImageData(0, 0, width, height);
      for (var i = 0; i < pixels.data.length; i += 4) {
        var r = pixels.data[i];
        var g = pixels.data[i + 1];
        var b = pixels.data[i + 2];
        if (r > 238 && g > 238 && b > 238) pixels.data[i + 3] = 0;
      }
      ctx.putImageData(pixels, 0, 0);
    }
    return canvas;
  }

  function toBlob(canvas, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, el.format.value, quality);
    });
  }

  async function processSignature() {
    if (busy || !file || !image) return;
    busy = true;
    update();
    try {
      var targetBytes = Math.max(5, Number(el.target.value || 100)) * 1024;
      var canvas = buildCanvas();
      U.setProgress(el.progress, 30);
      var blob = await toBlob(canvas, 0.85);
      if (el.format.value !== "image/png") {
        var low = 0.2;
        var high = 0.95;
        for (var i = 0; i < 8; i += 1) {
          var quality = (low + high) / 2;
          var candidate = await toBlob(canvas, quality);
          if (candidate.size <= targetBytes) {
            blob = candidate;
            low = quality;
          } else {
            high = quality;
          }
          U.setProgress(el.progress, 30 + i * 7);
        }
      }
      el.outputSize.textContent = U.formatBytes(blob.size);
      var ext = el.format.value === "image/png" ? "png" : el.format.value === "image/webp" ? "webp" : "jpg";
      U.downloadBlob(blob, U.safeBaseName(file.name) + "-signature." + ext);
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, "Done — resized and prepared your signature locally. Output: " + U.formatBytes(blob.size) + ".", "success");
    } catch (error) {
      U.setProgress(el.progress, 0);
      U.setStatus(el.status, "The signature could not be processed in your browser.", "error");
    } finally {
      busy = false;
      update();
    }
  }

  U.bindDropZone(el.zone, el.input, select);
  el.process.addEventListener("click", processSignature);
  el.clear.addEventListener("click", reset);
  reset();
}());
