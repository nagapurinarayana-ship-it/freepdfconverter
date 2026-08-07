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
    text: document.getElementById("watermarkText"), size: document.getElementById("fontSize"),
    opacity: document.getElementById("opacity"), rotation: document.getElementById("rotation"),
    color: document.getElementById("color"), apply: document.getElementById("watermarkButton"),
    clear: document.getElementById("clearButton"), progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };

  function controls() { el.input.disabled = busy; el.apply.disabled = busy || !source; el.clear.disabled = busy || !source; }
  function reset() {
    source = null; file = null; el.selected.textContent = "No PDF selected"; el.pages.textContent = "0";
    U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose a PDF, then customize your text watermark.", "info"); controls();
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
      U.setProgress(el.progress, 100); U.setStatus(el.status, count + " pages loaded. Customize the watermark and apply.", "success");
    } catch (error) {
      console.error(error); reset(); U.setStatus(el.status, "Could not open this PDF. It may be encrypted or invalid.", "error");
    } finally { busy = false; controls(); }
  }
  async function apply() {
    if (busy || !source || !file) return;
    var text = String(el.text.value || "").trim();
    if (!text) return U.setStatus(el.status, "Enter watermark text first.", "error");
    if (text.length > 100) return U.setStatus(el.status, "Keep watermark text to 100 characters or fewer.", "error");
    var fontSize = Math.max(12, Math.min(120, Number(el.size.value) || 42));
    var opacity = Math.max(.05, Math.min(.9, Number(el.opacity.value) || .22));
    var rotation = Number(el.rotation.value) || -35;
    var colour = U.hexToRgb(el.color.value);
    busy = true; controls(); U.setProgress(el.progress, 3); U.setStatus(el.status, "Adding watermark…", "info");
    try {
      var out = await window.PDFLib.PDFDocument.create();
      var indexes = source.getPageIndices();
      var copied = await out.copyPages(source, indexes);
      copied.forEach(function (page) { out.addPage(page); });
      var font = await out.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      for (var i = 0; i < out.getPageCount(); i += 1) {
        var page = out.getPage(i); var width = page.getWidth(); var height = page.getHeight();
        var textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: Math.max(18, (width - textWidth) / 2),
          y: height / 2,
          size: fontSize, font: font, opacity: opacity,
          rotate: window.PDFLib.degrees(rotation),
          color: window.PDFLib.rgb(colour.r, colour.g, colour.b)
        });
        U.setProgress(el.progress, 8 + ((i + 1) / out.getPageCount()) * 82);
      }
      var bytes = await out.save({ useObjectStreams: true });
      U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-watermarked.pdf");
      U.setProgress(el.progress, 100); U.setStatus(el.status, "Watermark added to every page. Download started.", "success");
    } catch (error) {
      console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not watermark this PDF. Try a different file or shorter text.", "error");
    } finally { busy = false; controls(); }
  }
  U.bindDropZone(el.zone, el.input, load);
  el.apply.addEventListener("click", apply);
  el.clear.addEventListener("click", reset);
  reset();
}());
