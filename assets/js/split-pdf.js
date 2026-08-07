(function () {
  "use strict";
  var U = window.FreePDF;
  var MAX_FILE = 80 * U.MB;
  var doc = null;
  var file = null;
  var busy = false;
  var el = {
    zone: document.getElementById("dropZone"),
    input: document.getElementById("pdfFile"),
    selected: document.getElementById("selectedFile"),
    pages: document.getElementById("pageCount"),
    from: document.getElementById("fromPage"),
    to: document.getElementById("toPage"),
    extract: document.getElementById("extractButton"),
    split: document.getElementById("splitButton"),
    clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };

  function controls() {
    el.input.disabled = busy;
    el.extract.disabled = busy || !doc;
    el.split.disabled = busy || !doc;
    el.clear.disabled = busy || !doc;
  }

  function reset() {
    doc = null; file = null;
    el.selected.textContent = "No PDF selected";
    el.pages.textContent = "0";
    el.from.value = "1"; el.to.value = "1";
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose a PDF to extract a range or split every page.", "info");
    controls();
  }

  async function load(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0];
    if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Please choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 80 MB for browser stability.", "error");
    if (!window.PDFLib) return U.setStatus(el.status, "The PDF library did not load. Refresh and retry.", "error");
    busy = true; controls(); U.setProgress(el.progress, 8); U.setStatus(el.status, "Reading PDF…", "info");
    try {
      doc = await window.PDFLib.PDFDocument.load(await next.arrayBuffer(), { updateMetadata: false });
      file = next;
      var count = doc.getPageCount();
      el.selected.textContent = next.name + " · " + U.formatBytes(next.size);
      el.pages.textContent = String(count);
      el.from.value = "1"; el.to.value = String(count);
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, count + " pages loaded. Choose a range or split to ZIP.", "success");
    } catch (error) {
      console.error(error); reset();
      U.setStatus(el.status, "Could not open this PDF. It may be encrypted or invalid.", "error");
    } finally { busy = false; controls(); }
  }

  function range() {
    var total = doc ? doc.getPageCount() : 0;
    var from = Math.floor(Number(el.from.value));
    var to = Math.floor(Number(el.to.value));
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to > total || from > to) return null;
    return { from: from, to: to };
  }

  async function extract() {
    if (busy || !doc || !file) return;
    var r = range();
    if (!r) return U.setStatus(el.status, "Enter a valid page range within this PDF.", "error");
    busy = true; controls(); U.setProgress(el.progress, 5); U.setStatus(el.status, "Extracting pages " + r.from + "–" + r.to + "…", "info");
    try {
      var out = await window.PDFLib.PDFDocument.create();
      var indexes = Array.from({ length: r.to - r.from + 1 }, function (_, i) { return r.from - 1 + i; });
      var pages = await out.copyPages(doc, indexes);
      pages.forEach(function (page) { out.addPage(page); });
      var bytes = await out.save({ useObjectStreams: true });
      U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-pages-" + r.from + "-to-" + r.to + ".pdf");
      U.setProgress(el.progress, 100); U.setStatus(el.status, "Selected pages extracted. Download started.", "success");
    } catch (error) {
      console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not extract that range. Try a smaller PDF.", "error");
    } finally { busy = false; controls(); }
  }

  async function splitAll() {
    if (busy || !doc || !file) return;
    if (!window.JSZip) return U.setStatus(el.status, "The ZIP library did not load. Refresh and retry.", "error");
    busy = true; controls(); U.setProgress(el.progress, 2);
    try {
      var zip = new window.JSZip();
      var total = doc.getPageCount();
      var base = U.safeBaseName(file.name);
      for (var i = 0; i < total; i += 1) {
        U.setStatus(el.status, "Creating page " + (i + 1) + " of " + total + "…", "info");
        var out = await window.PDFLib.PDFDocument.create();
        var copied = await out.copyPages(doc, [i]);
        out.addPage(copied[0]);
        zip.file(base + "-page-" + String(i + 1).padStart(3, "0") + ".pdf", await out.save({ useObjectStreams: true }));
        U.setProgress(el.progress, ((i + 1) / total) * 90);
      }
      U.setStatus(el.status, "Packaging ZIP…", "info");
      var zipBlob = await zip.generateAsync({ type: "blob" }, function (metadata) { U.setProgress(el.progress, 90 + metadata.percent * .1); });
      U.downloadBlob(zipBlob, base + "-pages.zip");
      U.setProgress(el.progress, 100); U.setStatus(el.status, "All " + total + " pages are in one ZIP. Download started.", "success");
    } catch (error) {
      console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not split this PDF. Try a smaller file.", "error");
    } finally { busy = false; controls(); }
  }

  U.bindDropZone(el.zone, el.input, load);
  el.extract.addEventListener("click", extract);
  el.split.addEventListener("click", splitAll);
  el.clear.addEventListener("click", reset);
  reset();
}());
