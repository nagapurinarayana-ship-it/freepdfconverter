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
    password: document.getElementById("pdfPassword"),
    showPassword: document.getElementById("showPassword"),
    authorization: document.getElementById("authorizationCheck"),
    unlock: document.getElementById("unlockButton"),
    clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };

  async function select(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0];
    if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");

    busy = true;
    update();
    try {
      var header = new Uint8Array(await next.slice(0, 1024).arrayBuffer());
      var text = String.fromCharCode.apply(null, header);
      if (text.indexOf("%PDF-") === -1) throw new Error("missing-pdf-header");
      file = next;
      U.setProgress(el.progress, 0);
      U.setStatus(el.status, "Ready. Enter the known password, or leave it blank if the PDF opens without one.", "success");
    } catch (error) {
      file = null;
      U.setStatus(el.status, "This file does not appear to be a readable PDF.", "error");
    } finally {
      busy = false;
      update();
    }
  }

  function update() {
    el.summary.textContent = file ? file.name + " · " + U.formatBytes(file.size) : "No PDF selected";
    el.unlock.disabled = busy || !file || !el.authorization.checked;
    el.clear.disabled = busy || (!file && !el.password.value && !el.authorization.checked && !el.showPassword.checked);
    el.input.disabled = busy;
    el.password.disabled = busy;
    el.showPassword.disabled = busy;
    el.authorization.disabled = busy;
  }

  function clear() {
    if (busy) return;
    file = null;
    el.input.value = "";
    el.password.value = "";
    el.password.type = "password";
    el.showPassword.checked = false;
    el.authorization.checked = false;
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose a PDF you are authorized to unlock.", "info");
    update();
  }

  function processInWorker(bytes, password) {
    return new Promise(function (resolve, reject) {
      var worker;
      try {
        worker = new Worker("/assets/js/unlock-pdf-worker.js");
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
      worker.postMessage({ id: U.createId(), bytes: bytes, password: password }, [bytes]);
    });
  }

  async function unlock() {
    if (busy || !file || !el.authorization.checked) return;
    if (el.password.value.indexOf("\0") !== -1) {
      U.setStatus(el.status, "The password contains an unsupported null character.", "error");
      return;
    }

    busy = true;
    update();
    try {
      U.setProgress(el.progress, 12);
      U.setStatus(el.status, "Reading the PDF locally…", "info");
      var bytes = await file.arrayBuffer();
      U.setProgress(el.progress, 26);
      U.setStatus(el.status, "Loading the local unlock engine and checking the password…", "info");
      var result = await processInWorker(bytes, el.password.value);
      var blob = new Blob([result.bytes], { type: "application/pdf" });
      U.downloadBlob(blob, U.safeBaseName(file.name) + "-unlocked.pdf");
      el.password.value = "";
      el.password.type = "password";
      el.showPassword.checked = false;
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, result.wasEncrypted
        ? "Done — password protection was removed and the unlocked PDF download started."
        : "This PDF was not encrypted. A new unencrypted copy was downloaded.", "success");
    } catch (error) {
      U.setProgress(el.progress, 0);
      U.setStatus(el.status, error && error.code === "unlock-failed"
        ? "Could not unlock this PDF. Check the password and make sure the file is not damaged."
        : "The local unlock engine could not process this PDF in your browser.", "error");
    } finally {
      busy = false;
      update();
    }
  }

  U.bindDropZone(el.zone, el.input, select);
  el.password.addEventListener("input", update);
  el.showPassword.addEventListener("change", function () { el.password.type = el.showPassword.checked ? "text" : "password"; update(); });
  el.authorization.addEventListener("change", update);
  el.unlock.addEventListener("click", unlock);
  el.clear.addEventListener("click", clear);
  clear();
}());
