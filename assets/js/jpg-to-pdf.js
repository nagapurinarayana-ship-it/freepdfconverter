(function () {
  "use strict";
  var U = window.FreePDF;
  var MAX_FILE = 30 * U.MB;
  var MAX_TOTAL = 120 * U.MB;
  var MAX_DIMENSION = 3600;
  var files = [];
  var busy = false;
  var el = {
    zone: document.getElementById("dropZone"), input: document.getElementById("imageFiles"),
    list: document.getElementById("fileList"), count: document.getElementById("fileCount"),
    pageSize: document.getElementById("pageSize"), filename: document.getElementById("outputFilename"),
    convert: document.getElementById("convertButton"), clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"), status: document.getElementById("toolStatus")
  };

  function revoke(entry) { if (entry && entry.url) URL.revokeObjectURL(entry.url); }
  function update() {
    el.list.replaceChildren();
    files.forEach(function (entry, index) {
      var li = document.createElement("li"); li.className = "file-row"; li.dataset.id = entry.id;
      var main = document.createElement("div"); main.className = "file-main";
      var image = document.createElement("img"); image.className = "image-thumb"; image.alt = ""; image.src = entry.url;
      var pos = document.createElement("span"); pos.className = "file-position"; pos.textContent = String(index + 1);
      var info = document.createElement("span"); info.className = "file-info";
      var name = document.createElement("span"); name.className = "file-name"; name.textContent = entry.file.name;
      var size = document.createElement("span"); size.className = "file-size"; size.textContent = U.formatBytes(entry.file.size);
      info.append(name, size); main.append(image, pos, info);
      var controls = document.createElement("span"); controls.className = "file-controls";
      [["up","↑",index===0],["down","↓",index===files.length-1],["remove","×",false]].forEach(function (spec) {
        var b = document.createElement("button"); b.type = "button"; b.dataset.action = spec[0]; b.textContent = spec[1];
        b.className = "icon-button " + (spec[0] === "remove" ? "remove" : ""); b.disabled = busy || spec[2];
        b.setAttribute("aria-label", spec[0] + " " + entry.file.name); controls.appendChild(b);
      });
      li.append(main, controls); el.list.appendChild(li);
    });
    el.count.textContent = files.length + (files.length === 1 ? " image selected" : " images selected");
    el.convert.disabled = busy || files.length === 0; el.clear.disabled = busy || files.length === 0; el.input.disabled = busy;
  }
  function add(collection) {
    if (busy) return;
    var incoming = Array.from(collection || []); if (!incoming.length) return;
    var invalid = incoming.find(function (f) { return !U.isImage(f); });
    if (invalid) return U.setStatus(el.status, invalid.name + " is not a supported JPG or PNG image.", "error");
    var large = incoming.find(function (f) { return f.size > MAX_FILE; });
    if (large) return U.setStatus(el.status, large.name + " is larger than 30 MB.", "error");
    if (U.totalSize(files.map(function (x) { return x.file; }).concat(incoming)) > MAX_TOTAL) {
      return U.setStatus(el.status, "Keep the selected images below 120 MB total.", "error");
    }
    incoming.forEach(function (file) { files.push({ id: U.createId(), file: file, url: URL.createObjectURL(file) }); });
    update(); U.setProgress(el.progress, 0); U.setStatus(el.status, files.length + " image(s) ready. Set their order and convert.", "success");
  }
  function clear() {
    if (busy) return;
    files.forEach(revoke); files = []; update(); U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose JPG or PNG images.", "info");
  }
  el.list.addEventListener("click", function (event) {
    if (busy) return;
    var button = event.target.closest("[data-action]"); var row = button && button.closest("[data-id]"); if (!row) return;
    var index = files.findIndex(function (x) { return x.id === row.dataset.id; }); if (index < 0) return;
    if (button.dataset.action === "remove") revoke(files.splice(index,1)[0]);
    if (button.dataset.action === "up" && index > 0) files.splice(index - 1,0,files.splice(index,1)[0]);
    if (button.dataset.action === "down" && index < files.length - 1) files.splice(index + 1,0,files.splice(index,1)[0]);
    update(); U.setStatus(el.status, files.length ? "Selection updated." : "Choose JPG or PNG images.", "info");
  });

  function loadBitmap(file) {
    if (typeof createImageBitmap === "function") return createImageBitmap(file);
    return new Promise(function (resolve, reject) {
      var image = new Image(); var url = URL.createObjectURL(file);
      image.onload = function () { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Could not decode image")); };
      image.src = url;
    });
  }
  async function normalize(file) {
    var image = await loadBitmap(file);
    var originalWidth = image.width || image.naturalWidth; var originalHeight = image.height || image.naturalHeight;
    var scale = Math.min(1, MAX_DIMENSION / Math.max(originalWidth, originalHeight));
    var width = Math.max(1, Math.round(originalWidth * scale)); var height = Math.max(1, Math.round(originalHeight * scale));
    var canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    var context = canvas.getContext("2d", { alpha: true }); context.drawImage(image, 0, 0, width, height);
    if (typeof image.close === "function") image.close();
    var png = /png/i.test(file.type) || /\.png$/i.test(file.name);
    var type = png ? "image/png" : "image/jpeg";
    var blob = await new Promise(function (resolve, reject) {
      canvas.toBlob(function (value) { value ? resolve(value) : reject(new Error("Image conversion failed")); }, type, .92);
    });
    return { bytes: await blob.arrayBuffer(), width: width, height: height, type: type };
  }
  async function convert() {
    if (busy || !files.length) return;
    if (!window.PDFLib) return U.setStatus(el.status, "The PDF library did not load. Refresh and retry.", "error");
    busy = true; update(); U.setProgress(el.progress, 2); U.setStatus(el.status, "Creating PDF…", "info");
    try {
      var doc = await window.PDFLib.PDFDocument.create();
      var preset = el.pageSize.value;
      var sizes = { A4: [595.28,841.89], Letter: [612,792] };
      for (var i = 0; i < files.length; i += 1) {
        U.setStatus(el.status, "Processing " + (i + 1) + " of " + files.length + ": " + files[i].file.name, "info");
        var imageData = await normalize(files[i].file);
        var embedded = imageData.type === "image/png" ? await doc.embedPng(imageData.bytes) : await doc.embedJpg(imageData.bytes);
        var pageWidth; var pageHeight;
        if (preset === "Fit") {
          pageWidth = Math.max(100, imageData.width * .75); pageHeight = Math.max(100, imageData.height * .75);
        } else { pageWidth = sizes[preset][0]; pageHeight = sizes[preset][1]; }
        var page = doc.addPage([pageWidth,pageHeight]);
        var ratio = Math.min(pageWidth / embedded.width, pageHeight / embedded.height, preset === "Fit" ? 10 : 1);
        var drawWidth = embedded.width * ratio; var drawHeight = embedded.height * ratio;
        page.drawImage(embedded, { x: (pageWidth - drawWidth) / 2, y: (pageHeight - drawHeight) / 2, width: drawWidth, height: drawHeight });
        U.setProgress(el.progress, ((i + 1) / files.length) * 90);
      }
      doc.setCreator("FreePDF Tools"); doc.setProducer("FreePDF Tools using pdf-lib");
      var bytes = await doc.save({ useObjectStreams: true });
      var name = U.safeBaseName(el.filename.value || "images") + ".pdf";
      U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), name);
      U.setProgress(el.progress, 100); U.setStatus(el.status, "PDF created: " + name + ". Download started.", "success");
    } catch (error) {
      console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not create the PDF. Try fewer or smaller images.", "error");
    } finally { busy = false; update(); }
  }
  U.bindDropZone(el.zone, el.input, add);
  el.convert.addEventListener("click", convert); el.clear.addEventListener("click", clear);
  clear();
}());
