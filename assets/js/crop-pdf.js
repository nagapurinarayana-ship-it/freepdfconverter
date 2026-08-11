(function () {
  "use strict";
  var U = window.FreePDF; var MAX_FILE = 120 * U.MB; var MM_TO_PT = 72 / 25.4; var file = null; var pageCount = 0; var busy = false;
  var el = { zone: document.getElementById("dropZone"), input: document.getElementById("pdfFile"), summary: document.getElementById("fileSummary"), left: document.getElementById("cropLeft"), top: document.getElementById("cropTop"), right: document.getElementById("cropRight"), bottom: document.getElementById("cropBottom"), crop: document.getElementById("cropButton"), clear: document.getElementById("clearButton"), progress: document.getElementById("progressBar"), status: document.getElementById("toolStatus") };
  async function select(collection) {
    if (busy) return; var next = Array.from(collection || [])[0]; if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");
    busy = true; update();
    try { var doc = await window.PDFLib.PDFDocument.load(await next.arrayBuffer(), { updateMetadata: false }); file = next; pageCount = doc.getPageCount(); U.setStatus(el.status, "Ready. Enter the edge margins to hide on every page.", "success"); }
    catch (error) { console.error(error); file = null; pageCount = 0; U.setStatus(el.status, "Could not open this PDF. Unlock it first if it has a password.", "error"); }
    finally { busy = false; update(); }
  }
  function update() { el.summary.textContent = file ? file.name + " · " + pageCount + " pages · " + U.formatBytes(file.size) : "No PDF selected"; el.crop.disabled = busy || !file; el.clear.disabled = busy || !file; }
  function clear() { if (busy) return; file = null; pageCount = 0; update(); U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose one PDF to crop.", "info"); }
  function margin(input) { var value = Number(input.value); return Number.isFinite(value) ? value : -1; }
  async function crop() {
    if (busy || !file) return;
    var values = [margin(el.left), margin(el.top), margin(el.right), margin(el.bottom)];
    if (values.some(function (value) { return value < 0 || value > 100; })) return U.setStatus(el.status, "Use crop margins between 0 and 100 mm.", "error");
    if (values.every(function (value) { return value === 0; })) return U.setStatus(el.status, "Enter at least one margin greater than 0 mm.", "error");
    busy = true; update();
    try {
      var doc = await window.PDFLib.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false }); var pages = doc.getPages();
      pages.forEach(function (page, index) {
        var box = page.getCropBox(); var left = values[0] * MM_TO_PT; var top = values[1] * MM_TO_PT; var right = values[2] * MM_TO_PT; var bottom = values[3] * MM_TO_PT;
        var width = box.width - left - right; var height = box.height - top - bottom;
        if (width < 36 || height < 36) throw new Error("Crop margins leave too little visible page area on page " + (index + 1));
        page.setCropBox(box.x + left, box.y + bottom, width, height); U.setProgress(el.progress, ((index + 1) / pages.length) * 82);
      });
      var bytes = await doc.save({ useObjectStreams: true }); U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-cropped.pdf");
      U.setProgress(el.progress, 100); U.setStatus(el.status, "Done — cropped " + pages.length + " pages. Download started.", "success");
    } catch (error) { console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, error && error.message && error.message.startsWith("Crop margins") ? error.message + "." : "Could not crop this PDF. Try smaller margins or an unlocked file.", "error"); }
    finally { busy = false; update(); }
  }
  U.bindDropZone(el.zone, el.input, select); el.crop.addEventListener("click", crop); el.clear.addEventListener("click", clear); clear();
}());
