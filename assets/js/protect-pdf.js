(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 120 * U.MB;
  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  var file = null;
  var busy = false;

  var el = {
    zone: document.getElementById("dropZone"),
    input: document.getElementById("pdfFile"),
    summary: document.getElementById("fileSummary"),
    password: document.getElementById("pdfPassword"),
    showPassword: document.getElementById("showPassword"),
    ownerPassword: document.getElementById("ownerPassword"),
    copyOwner: document.getElementById("copyOwnerPassword"),
    allowPrint: document.getElementById("allowPrint"),
    allowExtract: document.getElementById("allowExtract"),
    allowModify: document.getElementById("allowModify"),
    protect: document.getElementById("protectButton"),
    clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };

  function randomOwnerPassword(length) {
    var bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    var output = "";
    for (var i = 0; i < bytes.length; i += 1) output += ALPHABET[bytes[i] % ALPHABET.length];
    return output;
  }

  function resetOwnerPassword() {
    el.ownerPassword.value = randomOwnerPassword(24);
  }

  function update() {
    var ready = file && el.password.value.length > 0 && el.ownerPassword.value.length > 0;
    el.summary.textContent = file ? file.name + " · " + U.formatBytes(file.size) : "No PDF selected";
    el.protect.disabled = busy || !ready;
    el.clear.disabled = busy || !file;
    el.input.disabled = busy;
    el.password.disabled = busy;
    el.showPassword.disabled = busy;
    el.ownerPassword.disabled = busy;
    el.copyOwner.disabled = busy || !el.ownerPassword.value;
    el.allowPrint.disabled = busy;
    el.allowExtract.disabled = busy;
    el.allowModify.disabled = busy;
  }

  async function select(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0];
    if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");
    try {
      var header = new Uint8Array(await next.slice(0, 1024).arrayBuffer());
      var text = String.fromCharCode.apply(null, header);
      if (text.indexOf("%PDF-") === -1) throw new Error("missing-pdf-header");
      file = next;
      resetOwnerPassword();
      U.setProgress(el.progress, 0);
      U.setStatus(el.status, "Ready. Choose an opening password before protecting the PDF.", "success");
    } catch {
      file = null;
      U.setStatus(el.status, "This file does not appear to be a readable PDF.", "error");
    }
    update();
  }

  function clear() {
    if (busy) return;
    file = null;
    el.input.value = "";
    el.password.value = "";
    el.ownerPassword.value = "";
    el.password.type = "password";
    el.showPassword.checked = false;
    el.allowPrint.checked = true;
    el.allowExtract.checked = true;
    el.allowModify.checked = false;
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose a PDF to protect.", "info");
    update();
  }

  async function copyOwnerPassword() {
    if (!el.ownerPassword.value) return;
    try {
      await navigator.clipboard.writeText(el.ownerPassword.value);
      U.setStatus(el.status, "Owner password copied.", "success");
    } catch {
      el.ownerPassword.focus();
      el.ownerPassword.select();
      U.setStatus(el.status, "Copy is blocked by this browser. The owner password is selected so you can copy it manually.", "info");
    }
  }

  function processInWorker(bytes, options) {
    return new Promise(function (resolve, reject) {
      var worker;
      try { worker = new Worker("/assets/js/protect-pdf-worker.js"); }
      catch (error) { reject(error); return; }

      function finish() { worker.terminate(); }
      worker.onmessage = function (event) {
        var data = event.data || {};
        if (data.type === "progress") {
          U.setProgress(el.progress, data.value);
          return;
        }
        finish();
        if (data.type === "result") { resolve(data); return; }
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
      worker.postMessage({ id: U.createId(), bytes: bytes, userPassword: options.userPassword, ownerPassword: options.ownerPassword, allowPrint: options.allowPrint, allowExtract: options.allowExtract, allowModify: options.allowModify }, [bytes]);
    });
  }

  async function protect() {
    if (busy || !file) return;
    var userPassword = el.password.value;
    if (!userPassword || userPassword.indexOf("\0") !== -1) {
      U.setStatus(el.status, "Choose an opening password without null characters.", "error");
      return;
    }
    if (userPassword.length > 127) {
      U.setStatus(el.status, "Keep the opening password at 127 characters or fewer.", "error");
      return;
    }

    busy = true;
    update();
    try {
      U.setProgress(el.progress, 12);
      U.setStatus(el.status, "Reading the PDF locally…", "info");
      var bytes = await file.arrayBuffer();
      U.setProgress(el.progress, 28);
      U.setStatus(el.status, "Encrypting the PDF with the local security engine…", "info");
      var result = await processInWorker(bytes, {
        userPassword: userPassword,
        ownerPassword: el.ownerPassword.value,
        allowPrint: el.allowPrint.checked,
        allowExtract: el.allowExtract.checked,
        allowModify: el.allowModify.checked
      });
      U.downloadBlob(new Blob([result.bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-protected.pdf");
      el.password.value = "";
      el.password.type = "password";
      el.showPassword.checked = false;
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, "Done — 256-bit PDF encryption was applied. Download started.", "success");
    } catch (error) {
      console.error(error);
      U.setProgress(el.progress, 0);
      U.setStatus(el.status, error && error.code === "password-too-long"
        ? "The password is too long for this PDF encryption format."
        : "The local encryption engine could not protect this PDF. Try a smaller, unlocked PDF.", "error");
    } finally {
      userPassword = "";
      busy = false;
      update();
    }
  }

  el.password.addEventListener("input", update);
  el.showPassword.addEventListener("change", function () { el.password.type = el.showPassword.checked ? "text" : "password"; update(); });
  el.copyOwner.addEventListener("click", copyOwnerPassword);
  el.protect.addEventListener("click", protect);
  el.clear.addEventListener("click", clear);
  U.bindDropZone(el.zone, el.input, select);
  clear();
}());