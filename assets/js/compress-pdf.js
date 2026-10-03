(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 120 * U.MB;
  var file = null;
  var busy = false;
  var policyPromise = import("/assets/js/core/pdf-target-policy.mjs");
  var el = {
    zone: document.getElementById("dropZone"), input: document.getElementById("pdfFile"), summary: document.getElementById("fileSummary"),
    mode: document.getElementById("compressionMode"), target: document.getElementById("targetSize"), customTargetField: document.getElementById("customTargetField"), customTarget: document.getElementById("customTarget"), targetField: document.getElementById("targetField"), hint: document.getElementById("modeHint"), originalSize: document.getElementById("originalSize"), outputSize: document.getElementById("outputSize"), savings: document.getElementById("savings"), compress: document.getElementById("compressButton"), clear: document.getElementById("clearButton"), progress: document.getElementById("progressBar"), status: document.getElementById("toolStatus")
  };

  function updateMode() {
    var targetMode = el.mode.value === "target";
    el.targetField.hidden = !targetMode;
    el.customTargetField.hidden = !targetMode || el.target.value !== "custom";
    el.hint.textContent = targetMode ? "Target mode rebuilds pages as compressed images and tries a bounded quality/resolution matrix. Selectable text and vector structure may not be preserved." : "Lossless mode recompresses supported PDF streams and objects without intentionally lowering embedded image quality.";
  }

  function update() {
    el.summary.textContent = file ? file.name + " · " + U.formatBytes(file.size) : "No PDF selected";
    el.compress.disabled = busy || !file; el.clear.disabled = busy || !file; el.input.disabled = busy; el.mode.disabled = busy; el.target.disabled = busy; el.customTarget.disabled = busy;
  }

  function reset() {
    if (busy) return;
    file = null; el.input.value = ""; el.originalSize.textContent = "—"; el.outputSize.textContent = "—"; el.savings.textContent = "—"; U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose a PDF. Use Target size when an upload form has a maximum file-size limit.", "info"); updateMode(); update();
  }

  function select(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0]; if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");
    file = next; el.originalSize.textContent = U.formatBytes(next.size); el.outputSize.textContent = "—"; el.savings.textContent = "—"; U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Ready. Choose Lossless for structure preservation or Target size for stronger image compression.", "success"); update();
  }

  function processInWorker(bytes, inputSize) {
    return new Promise(function (resolve, reject) {
      var worker;
      try { worker = new Worker("/assets/js/compress-pdf-worker.js"); } catch (error) { reject(error); return; }
      function finish() { worker.terminate(); }
      worker.onmessage = function (event) {
        var data = event.data || {};
        if (data.type === "progress") { U.setProgress(el.progress, data.value); return; }
        finish();
        if (data.type === "result") resolve(data); else { var error = new Error(data.code || "processing-failed"); error.code = data.code || "processing-failed"; reject(error); }
      };
      worker.onerror = function (event) { event.preventDefault(); finish(); var error = new Error("worker-failed"); error.code = "worker-failed"; reject(error); };
      worker.postMessage({ id: U.createId(), bytes: bytes, inputSize: inputSize }, [bytes]);
    });
  }

  async function loadPdfJs() {
    var module = await import("/assets/vendor/pdfjs/pdf.min.mjs");
    module.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.mjs";
    return module;
  }

  function canvasToJpeg(canvas, quality) {
    return new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error("jpeg-encode-failed")); }, "image/jpeg", quality); });
  }

  async function renderPdfCandidate(pdfjs, bytes, settings) {
    var loadingTask = pdfjs.getDocument({ data: bytes.slice(0) });
    var pdf = await loadingTask.promise;
    var PDFDocument = window.PDFLib && window.PDFLib.PDFDocument;
    if (!PDFDocument) throw new Error("pdf-lib-not-loaded");
    var output = await PDFDocument.create({ addDefaultPage: false, updateMetadata: false });
    var canvas = document.createElement("canvas"); var context = canvas.getContext("2d", { alpha: false });
    try {
      for (var pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        var page = await pdf.getPage(pageNumber); var viewport = page.getViewport({ scale: settings.scale });
        canvas.width = Math.max(1, Math.floor(viewport.width)); canvas.height = Math.max(1, Math.floor(viewport.height));
        context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        var imageBlob = await canvasToJpeg(canvas, settings.quality); var imageBytes = new Uint8Array(await imageBlob.arrayBuffer()); var image = await output.embedJpg(imageBytes);
        var outPage = output.addPage([viewport.width, viewport.height]); outPage.drawImage(image, { x: 0, y: 0, width: outPage.getWidth(), height: outPage.getHeight() });
        U.setProgress(el.progress, 20 + Math.round((pageNumber / pdf.numPages) * 45)); page.cleanup();
      }
      var saved = await output.save({ useObjectStreams: true, addDefaultPage: false }); return new Blob([saved], { type: "application/pdf" });
    } finally { canvas.width = 1; canvas.height = 1; if (pdf.cleanup) pdf.cleanup(); if (pdf.destroy) await pdf.destroy(); }
  }

  async function targetCompress(bytes, targetBytes) {
    var policy = await policyPromise; var pdfjs = await loadPdfJs(); var best = null;
    for (var i = 0; i < policy.TARGET_CANDIDATES.length; i++) {
      var settings = policy.TARGET_CANDIDATES[i]; U.setStatus(el.status, "Trying target-size setting " + (i + 1) + " of " + policy.TARGET_CANDIDATES.length + "…", "info");
      var candidate = await renderPdfCandidate(pdfjs, bytes, settings); if (!best || candidate.size < best.size) best = candidate;
      if (policy.isTargetReached(candidate.size, targetBytes)) return { blob: candidate, reached: true };
    }
    return { blob: best, reached: false };
  }

  async function compress() {
    if (busy || !file) return; busy = true; update();
    try {
      var policy = await policyPromise; U.setProgress(el.progress, 4); var bytes = await file.arrayBuffer(); U.setProgress(el.progress, 15);
      var outputBlob; var targetReached = true;
      if (el.mode.value === "target") {
        var targetBytes = policy.targetBytesFromSelection(el.target.value, el.customTarget.value);
        if (targetBytes >= file.size) {
          U.setStatus(el.status, "The selected target is already larger than the source file. Running a lossless pass instead.", "info");
          var lossless = await processInWorker(bytes, file.size); outputBlob = new Blob([lossless.bytes], { type: "application/pdf" });
        } else {
          var targetResult = await targetCompress(bytes, targetBytes); outputBlob = targetResult.blob; targetReached = targetResult.reached;
        }
      } else {
        U.setStatus(el.status, "Compressing PDF streams and objects locally…", "info"); var result = await processInWorker(bytes, file.size); outputBlob = new Blob([result.bytes], { type: "application/pdf" });
      }
      if (!outputBlob || !outputBlob.size) throw new Error("empty-output");
      var outputSize = outputBlob.size; el.outputSize.textContent = U.formatBytes(outputSize); var reduction = policy.reductionPercent(file.size, outputSize); el.savings.textContent = reduction.toFixed(reduction >= 10 ? 0 : 1) + "%";
      if (outputSize >= file.size && el.mode.value === "lossless") { U.setProgress(el.progress, 100); U.setStatus(el.status, "This PDF was already efficiently compressed for the lossless pass. No larger replacement was downloaded.", "info"); return; }
      U.downloadBlob(outputBlob, U.safeBaseName(file.name) + "-compressed.pdf"); U.setProgress(el.progress, 100);
      if (el.mode.value === "target" && !targetReached) U.setStatus(el.status, "Closest result: " + U.formatBytes(outputSize) + ". The requested target was not reached without more severe degradation, so the tool stopped at its safest tested setting.", "info");
      else U.setStatus(el.status, "Done — reduced the PDF from " + U.formatBytes(file.size) + " to " + U.formatBytes(outputSize) + " and started the download.", "success");
    } catch (error) {
      U.setProgress(el.progress, 0);
      if (error && error.code === "encrypted-pdf") U.setStatus(el.status, "This PDF is password-protected. Unlock it first when you know the password, then compress the resulting copy.", "error");
      else if (error && error.message === "pdf-lib-not-loaded") U.setStatus(el.status, "The PDF compression engine could not be loaded. Refresh the page and try again.", "error");
      else U.setStatus(el.status, "The PDF could not be compressed in your browser. Try a smaller or valid PDF.", "error");
    } finally { busy = false; update(); }
  }

  U.bindDropZone(el.zone, el.input, select); el.mode.addEventListener("change", updateMode); el.target.addEventListener("change", updateMode); el.customTarget.addEventListener("input", updateMode); el.compress.addEventListener("click", compress); el.clear.addEventListener("click", reset); reset();
}());
