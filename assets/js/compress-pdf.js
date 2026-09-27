(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 120 * U.MB;
  var file = null;
  var busy = false;
  var el = {
    zone: document.getElementById("dropZone"),
    input: document.getElementById("pdfFile"),
    summary: document.getElementById("fileSummary"),
    originalSize: document.getElementById("originalSize"),
    outputSize: document.getElementById("outputSize"),
    savings: document.getElementById("savings"),
    compress: document.getElementById("compressButton"),
    clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };

  function update() {
    el.summary.textContent = file ? file.name + " · " + U.formatBytes(file.size) : "No PDF selected";
    el.originalSize.textContent = file ? U.formatBytes(file.size) : "—";
    el.compress.disabled = busy || !file;
    el.clear.disabled = busy || !file;
    el.input.disabled = busy;
  }

  function reset() {
    if (busy) return;
    file = null;
    el.input.value = "";
    el.originalSize.textContent = "—";
    el.outputSize.textContent = "—";
    el.savings.textContent = "—";
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose a PDF to reduce its file size without intentionally degrading embedded images.", "info");
    update();
  }

  function select(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0];
    if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");

    file = next;
    el.outputSize.textContent = "—";
    el.savings.textContent = "—";
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Ready to compress. This lossless pass can reduce stream and object overhead; image-heavy PDFs may shrink less.", "success");
    update();
  }

  function processInWorker(bytes, inputSize) {
    return new Promise(function (resolve, reject) {
      var worker;
      try {
        worker = new Worker("/assets/js/compress-pdf-worker.js");
      } catch (error) {
        reject(error);
        return;
      }

      function finish() { worker.terminate(); }

      worker.onmessage = function (event) {
        var data = event.data || {};
        if (data.type === "progress") {
          U.setProgress(el.progress, data.value);
          return;
        }
        finish();
        if (data.type === "result") {
          resolve(data);
          return;
        }
        var error = new Error(data.code || "processing-failed");
        error.code = data.code || "processing-failed";
        reject(error);
      };

      worker.onerror = function (event) {
        event.preventDefault();
        finish();
        var error = new Error("worker-failed");
        error.code = "worker-failed";
        reject(error);
      };

      worker.postMessage({
        id: U.createId(),
        bytes: bytes,
        inputSize: inputSize
      }, [bytes]);
    });
  }

  async function compress() {
    if (busy || !file) return;

    busy = true;
    update();

    try {
      U.setProgress(el.progress, 4);
      U.setStatus(el.status, "Reading the PDF locally…", "info");

      var bytes = await file.arrayBuffer();
      U.setProgress(el.progress, 18);

      U.setStatus(el.status, "Compressing PDF streams and objects locally…", "info");
      var result = await processInWorker(bytes, file.size);
      var outputBlob = new Blob([result.bytes], { type: "application/pdf" });
      var outputSize = outputBlob.size;
      var reduction = file.size > 0 ? Math.max(0, (file.size - outputSize) / file.size * 100) : 0;

      el.outputSize.textContent = U.formatBytes(outputSize);

      if (outputSize >= file.size) {
        el.savings.textContent = "0%";
        U.setProgress(el.progress, 100);
        U.setStatus(el.status, "This PDF was already efficiently compressed for this lossless pass. The original file is smaller, so no larger replacement was downloaded.", "info");
        return;
      }

      el.savings.textContent = reduction.toFixed(reduction >= 10 ? 0 : 1) + "%";
      U.downloadBlob(outputBlob, U.safeBaseName(file.name) + "-compressed.pdf");
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, "Done — reduced the PDF from " + U.formatBytes(file.size) + " to " + U.formatBytes(outputSize) + " and started the download.", "success");
    } catch (error) {
      U.setProgress(el.progress, 0);
      if (error && error.code === "encrypted-pdf") {
        U.setStatus(el.status, "This PDF is password-protected. Unlock it first when you know the password, then compress the resulting copy.", "error");
      } else {
        U.setStatus(el.status, "The PDF could not be compressed in your browser. Try a smaller or valid PDF.", "error");
      }
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
