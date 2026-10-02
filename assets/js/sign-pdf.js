(function () {
  "use strict";
  var U = window.FreePDF;
  var MAX_FILE = 120 * U.MB;
  var file = null;
  var pageCount = 0;
  var busy = false;
  var drawing = false;
  var hasInk = false;
  var lastPoint = null;

  var el = {
    zone: document.getElementById("dropZone"),
    input: document.getElementById("pdfFile"),
    summary: document.getElementById("fileSummary"),
    mode: document.getElementById("signatureMode"),
    ink: document.getElementById("inkColor"),
    size: document.getElementById("signatureSize"),
    typed: document.getElementById("typedSignature"),
    canvas: document.getElementById("signatureCanvas"),
    clearSignature: document.getElementById("clearSignature"),
    page: document.getElementById("signPage"),
    scope: document.getElementById("signScope"),
    position: document.getElementById("signPosition"),
    sign: document.getElementById("signButton"),
    clearFile: document.getElementById("clearFile"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };
  var ctx = el.canvas.getContext("2d");
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  function resizeCanvas() {
    var current = el.canvas.width;
    if (!current) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    hasInk = false;
    if (el.mode.value === "type") renderTyped();
  }

  function canvasPoint(event) {
    var rect = el.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * el.canvas.width / rect.width,
      y: (event.clientY - rect.top) * el.canvas.height / rect.height
    };
  }

  function renderTyped() {
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    var value = el.typed.value.trim();
    if (!value) { hasInk = false; return; }
    var size = 104;
    ctx.fillStyle = el.ink.value;
    ctx.font = 'italic ' + size + 'px "Brush Script MT","Segoe Print","Comic Sans MS",cursive';
    ctx.textBaseline = "middle";
    var width = ctx.measureText(value).width;
    while (width > el.canvas.width - 60 && size > 48) {
      size -= 4;
      ctx.font = 'italic ' + size + 'px "Brush Script MT","Segoe Print","Comic Sans MS",cursive';
      width = ctx.measureText(value).width;
    }
    ctx.fillText(value, Math.max(20, (el.canvas.width - width) / 2), el.canvas.height / 2);
    hasInk = true;
  }

  function clearSignature() {
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    hasInk = false;
    U.setStatus(el.status, file ? "Create a signature, then sign the PDF." : "Choose a PDF and create your signature.", "info");
  }

  function setMode() {
    el.typed.closest(".field").style.display = el.mode.value === "type" ? "" : "none";
    el.canvas.style.backgroundColor = "#fff";
    if (el.mode.value === "type") renderTyped();
    else clearSignature();
  }

  function update() {
    el.summary.textContent = file ? file.name + " · " + pageCount + " pages · " + U.formatBytes(file.size) : "No PDF selected";
    el.page.max = String(Math.max(1, pageCount));
    el.page.disabled = !file || busy;
    el.scope.disabled = !file || busy;
    el.position.disabled = !file || busy;
    el.sign.disabled = busy || !file;
    el.clearFile.disabled = busy || !file;
  }

  async function select(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0];
    if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");
    busy = true; update();
    try {
      var doc = await window.PDFLib.PDFDocument.load(await next.arrayBuffer(), { updateMetadata: false });
      file = next;
      pageCount = doc.getPageCount();
      el.page.value = "1";
      U.setStatus(el.status, "Ready to sign " + pageCount + " pages.", "success");
    } catch (error) {
      console.error(error);
      file = null; pageCount = 0;
      U.setStatus(el.status, "Could not open this PDF. Unlock it first if it has a password.", "error");
    } finally { busy = false; update(); }
  }

  function clearFile() {
    if (busy) return;
    file = null; pageCount = 0; el.page.value = "1";
    U.setProgress(el.progress, 0);
    clearSignature();
    update();
  }

  function pointerDown(event) {
    if (el.mode.value !== "draw" || busy) return;
    event.preventDefault();
    try { el.canvas.setPointerCapture(event.pointerId); } catch {}
    drawing = true;
    lastPoint = canvasPoint(event);
  }

  function pointerMove(event) {
    if (!drawing || el.mode.value !== "draw") return;
    event.preventDefault();
    var point = canvasPoint(event);
    ctx.strokeStyle = el.ink.value;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint = point;
    hasInk = true;
  }

  function pointerUp(event) {
    if (!drawing) return;
    event.preventDefault();
    drawing = false;
    lastPoint = null;
  }

  function cropCanvas(source) {
    var data = source.getContext("2d").getImageData(0, 0, source.width, source.height).data;
    var minX = source.width, minY = source.height, maxX = -1, maxY = -1;
    for (var y = 0; y < source.height; y += 2) {
      for (var x = 0; x < source.width; x += 2) {
        var alpha = data[(y * source.width + x) * 4 + 3];
        if (alpha > 12) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    var pad = 24;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(source.width - 1, maxX + pad); maxY = Math.min(source.height - 1, maxY + pad);
    var out = document.createElement("canvas");
    out.width = maxX - minX + 1; out.height = maxY - minY + 1;
    out.getContext("2d").drawImage(source, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function signatureCanvasForPdf() {
    if (el.mode.value === "type") renderTyped();
    var cropped = cropCanvas(el.canvas);
    if (!cropped) throw new Error("empty-signature");
    return cropped;
  }

  async function signPdf() {
    if (busy || !file) return;
    if (!hasInk && el.mode.value === "type") renderTyped();
    if (!hasInk) return U.setStatus(el.status, "Create a signature first.", "error");
    var targetPage = Number.parseInt(el.page.value, 10);
    if (!Number.isFinite(targetPage) || targetPage < 1 || targetPage > pageCount) return U.setStatus(el.status, "Choose a page between 1 and " + pageCount + ".", "error");
    busy = true; update();
    try {
      var source = signatureCanvasForPdf();
      var doc = await window.PDFLib.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
      var png = await doc.embedPng(source.toDataURL("image/png"));
      var pages = doc.getPages();
      var targets = el.scope.value === "all" ? pages.map(function (_, i) { return i; }) : [targetPage - 1];
      var width = Number.parseInt(el.size.value, 10) || 190;
      var imageScale = Math.min(1, width / png.width);
      var dims = png.scale(imageScale);
      var margin = 36;
      for (var i = 0; i < targets.length; i += 1) {
        var index = targets[i];
        var page = pages[index];
        var size = page.getSize();
        var x = el.position.value === "bottom-left" ? margin : el.position.value === "bottom-right" ? size.width - dims.width - margin : (size.width - dims.width) / 2;
        var y = margin + 8;
        page.drawImage(png, { x: Math.max(margin, x), y: Math.max(margin, y), width: dims.width, height: dims.height, opacity: 1 });
        U.setProgress(el.progress, ((i + 1) / targets.length) * 88);
      }
      var bytes = await doc.save({ useObjectStreams: true });
      U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-signed.pdf");
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, "Done — signed " + targets.length + (targets.length === 1 ? " page." : " pages.") + " Download started.", "success");
    } catch (error) {
      console.error(error);
      U.setProgress(el.progress, 0);
      U.setStatus(el.status, error && error.message === "empty-signature" ? "Create a signature first." : "Could not sign this PDF. Try a smaller, unlocked PDF.", "error");
    } finally { busy = false; update(); }
  }

  el.mode.addEventListener("change", setMode);
  el.typed.addEventListener("input", function () { if (el.mode.value === "type") renderTyped(); });
  el.ink.addEventListener("input", function () { if (el.mode.value === "type") renderTyped(); });
  el.clearSignature.addEventListener("click", clearSignature);
  el.clearFile.addEventListener("click", clearFile);
  el.sign.addEventListener("click", signPdf);
  el.canvas.addEventListener("pointerdown", pointerDown);
  el.canvas.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
  U.bindDropZone(el.zone, el.input, select);
  setMode();
  update();
}());
