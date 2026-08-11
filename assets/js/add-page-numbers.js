(function () {
  "use strict";
  var U = window.FreePDF; var MAX_FILE = 120 * U.MB; var file = null; var pageCount = 0; var busy = false;
  var el = {
    zone: document.getElementById("dropZone"), input: document.getElementById("pdfFile"), summary: document.getElementById("fileSummary"),
    from: document.getElementById("fromPage"), to: document.getElementById("toPage"), first: document.getElementById("firstNumber"),
    position: document.getElementById("numberPosition"), size: document.getElementById("fontSize"), margin: document.getElementById("marginSize"),
    add: document.getElementById("addButton"), clear: document.getElementById("clearButton"), progress: document.getElementById("progressBar"), status: document.getElementById("toolStatus")
  };

  async function select(collection) {
    if (busy) return; var next = Array.from(collection || [])[0]; if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");
    busy = true; update();
    try {
      var doc = await window.PDFLib.PDFDocument.load(await next.arrayBuffer(), { updateMetadata: false });
      file = next; pageCount = doc.getPageCount(); el.from.value = "1"; el.to.value = String(pageCount); el.from.max = String(pageCount); el.to.max = String(pageCount);
      U.setStatus(el.status, "Ready to add numbers to " + pageCount + " pages.", "success");
    } catch (error) { console.error(error); file = null; pageCount = 0; U.setStatus(el.status, "Could not open this PDF. Unlock it first if it has a password.", "error"); }
    finally { busy = false; update(); }
  }

  function update() {
    el.summary.textContent = file ? file.name + " · " + pageCount + " pages · " + U.formatBytes(file.size) : "No PDF selected";
    el.add.disabled = busy || !file; el.clear.disabled = busy || !file;
  }
  function clear() { if (busy) return; file = null; pageCount = 0; el.from.value = "1"; el.to.value = ""; el.first.value = "1"; update(); U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose one PDF to number.", "info"); }
  function integer(input, fallback) { var value = Number.parseInt(input.value, 10); return Number.isFinite(value) ? value : fallback; }

  async function addNumbers() {
    if (busy || !file) return;
    var from = integer(el.from, 1); var to = integer(el.to, pageCount); var first = integer(el.first, 1); var size = integer(el.size, 12); var margin = integer(el.margin, 18);
    if (from < 1 || to > pageCount || from > to) return U.setStatus(el.status, "Enter a valid page range between 1 and " + pageCount + ".", "error");
    if (size < 8 || size > 48 || margin < 4 || margin > 100) return U.setStatus(el.status, "Use a font size from 8–48 pt and margin from 4–100 pt.", "error");
    busy = true; update();
    try {
      var doc = await window.PDFLib.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
      var font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica); var pages = doc.getPages(); var total = to - from + 1;
      for (var i = from - 1; i < to; i += 1) {
        var text = String(first + (i - (from - 1))); var width = font.widthOfTextAtSize(text, size); var page = pages[i]; var dims = page.getSize(); var top = el.position.value.startsWith("top-"); var side = el.position.value.split("-")[1];
        var x = side === "left" ? margin : side === "right" ? dims.width - margin - width : (dims.width - width) / 2;
        var y = top ? dims.height - margin - size : margin;
        page.drawText(text, { x: x, y: y, size: size, font: font, color: window.PDFLib.rgb(0.22, 0.28, 0.38) });
        U.setProgress(el.progress, ((i - from + 2) / total) * 86);
      }
      var bytes = await doc.save({ useObjectStreams: true }); U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-numbered.pdf");
      U.setProgress(el.progress, 100); U.setStatus(el.status, "Done — added " + total + " page numbers. Download started.", "success");
    } catch (error) { console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not add page numbers. Try a smaller, unlocked PDF.", "error"); }
    finally { busy = false; update(); }
  }
  U.bindDropZone(el.zone, el.input, select); el.add.addEventListener("click", addNumbers); el.clear.addEventListener("click", clear); clear();
}());
