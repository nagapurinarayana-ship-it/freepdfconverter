(function () {
  "use strict";
  var U = window.FreePDF;
  var MAX_FILE = 80 * U.MB;
  var source = null;
  var file = null;
  var busy = false;
  var el = {
    zone: document.getElementById("dropZone"), input: document.getElementById("pdfFile"),
    selected: document.getElementById("selectedFile"), pages: document.getElementById("pageCount"),
    from: document.getElementById("fromPage"), to: document.getElementById("toPage"),
    angle: document.getElementById("angle"), all: document.getElementById("allPages"),
    rotate: document.getElementById("rotateButton"), clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"), status: document.getElementById("toolStatus")
  };

  function controls() {
    el.input.disabled = busy;
    el.rotate.disabled = busy || !source;
    el.clear.disabled = busy || !source;
    el.from.disabled = busy || el.all.checked;
    el.to.disabled = busy || el.all.checked;
  }
  function reset() {
    source = null; file = null; el.selected.textContent = "No PDF selected"; el.pages.textContent = "0";
    el.from.value = "1"; el.to.value = "1"; U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose a PDF and rotation angle.", "info"); controls();
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
      source = await window.PDFLib.PDFDocument.load(await next.arrayBuffer(), { updateMetadata: false });
      file = next; var count = source.getPageCount();
      el.selected.textContent = next.name + " · " + U.formatBytes(next.size); el.pages.textContent = String(count);
      el.from.value = "1"; el.to.value = String(count); U.setProgress(el.progress, 100);
      U.setStatus(el.status, count + " pages loaded. Choose what to rotate.", "success");
    } catch (error) {
      console.error(error); reset(); U.setStatus(el.status, "Could not open this PDF. It may be encrypted or invalid.", "error");
    } finally { busy = false; controls(); }
  }
  function selectedRange() {
    var count = source.getPageCount();
    if (el.all.checked) return { from: 1, to: count };
    var from = Math.floor(Number(el.from.value)); var to = Math.floor(Number(el.to.value));
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to > count || from > to) return null;
    return { from: from, to: to };
  }
  async function rotate() {
    if (busy || !source || !file) return;
    var r = selectedRange();
    if (!r) return U.setStatus(el.status, "Enter a valid page range.", "error");
    var delta = Number(el.angle.value);
    if ([90,180,270].indexOf(delta) < 0) return U.setStatus(el.status, "Choose 90°, 180°, or 270°.", "error");
    busy = true; controls(); U.setProgress(el.progress, 3); U.setStatus(el.status, "Applying rotation…", "info");
    try {
      var out = await window.PDFLib.PDFDocument.create();
      var indexes = source.getPageIndices();
      var pages = await out.copyPages(source, indexes);
      pages.forEach(function (page) { out.addPage(page); });
      for (var i = r.from - 1; i <= r.to - 1; i += 1) {
        var page = out.getPage(i);
        var current = page.getRotation().angle || 0;
        page.setRotation(window.PDFLib.degrees((current + delta) % 360));
        U.setProgress(el.progress, 10 + ((i - r.from + 2) / (r.to - r.from + 1)) * 78);
      }
      var bytes = await out.save({ useObjectStreams: true });
      U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-rotated.pdf");
      U.setProgress(el.progress, 100); U.setStatus(el.status, "Rotation complete. Download started.", "success");
    } catch (error) {
      console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not rotate this PDF. Try another valid file.", "error");
    } finally { busy = false; controls(); }
  }
  U.bindDropZone(el.zone, el.input, load);
  el.all.addEventListener("change", controls);
  el.rotate.addEventListener("click", rotate);
  el.clear.addEventListener("click", reset);
  reset();
}());
