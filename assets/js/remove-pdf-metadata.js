(function () {
  "use strict";
  var U = window.FreePDF; var MAX_FILE = 120 * U.MB; var file = null; var pageCount = 0; var busy = false;
  var el = { zone: document.getElementById("dropZone"), input: document.getElementById("pdfFile"), summary: document.getElementById("fileSummary"), clean: document.getElementById("cleanButton"), clear: document.getElementById("clearButton"), progress: document.getElementById("progressBar"), status: document.getElementById("toolStatus") };
  async function select(collection) {
    if (busy) return; var next = Array.from(collection || [])[0]; if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");
    busy = true; update();
    try { var doc = await window.PDFLib.PDFDocument.load(await next.arrayBuffer(), { updateMetadata: false }); file = next; pageCount = doc.getPageCount(); U.setStatus(el.status, "Ready to remove standard document metadata.", "success"); }
    catch (error) { console.error(error); file = null; pageCount = 0; U.setStatus(el.status, "Could not open this PDF. Unlock it first if it has a password.", "error"); }
    finally { busy = false; update(); }
  }
  function update() { el.summary.textContent = file ? file.name + " · " + pageCount + " pages · " + U.formatBytes(file.size) : "No PDF selected"; el.clean.disabled = busy || !file; el.clear.disabled = busy || !file; }
  function clear() { if (busy) return; file = null; pageCount = 0; update(); U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose one PDF to clean.", "info"); }
  async function clean() {
    if (busy || !file) return; busy = true; update();
    try {
      U.setStatus(el.status, "Inspecting document information and XMP metadata…", "info"); U.setProgress(el.progress, 20);
      var P = window.PDFLib; var doc = await P.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false }); var removed = 0;
      var infoRef = doc.context.trailerInfo && doc.context.trailerInfo.Info; var info = infoRef ? doc.context.lookup(infoRef) : null;
      ["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate", "Trapped"].forEach(function (key) {
        if (info && typeof info.has === "function" && info.has(P.PDFName.of(key))) { info.delete(P.PDFName.of(key)); removed += 1; }
      });
      if (doc.catalog.has(P.PDFName.of("Metadata"))) { doc.catalog.delete(P.PDFName.of("Metadata")); removed += 1; }
      U.setProgress(el.progress, 70); var bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-metadata-removed.pdf");
      U.setProgress(el.progress, 100); U.setStatus(el.status, "Done — removed " + removed + " standard metadata " + (removed === 1 ? "entry" : "entries") + ". Download started.", "success");
    } catch (error) { console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not clean this PDF. Try a smaller, unlocked file.", "error"); }
    finally { busy = false; update(); }
  }
  U.bindDropZone(el.zone, el.input, select); el.clean.addEventListener("click", clean); el.clear.addEventListener("click", clear); clear();
}());
