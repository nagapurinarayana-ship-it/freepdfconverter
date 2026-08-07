(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 60 * U.MB;
  var MAX_TOTAL = 150 * U.MB;
  var files = [];
  var busy = false;
  var el = {
    zone: document.getElementById("dropZone"),
    input: document.getElementById("pdfFiles"),
    list: document.getElementById("fileList"),
    count: document.getElementById("fileCount"),
    merge: document.getElementById("mergeButton"),
    clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };

  function update() {
    el.list.replaceChildren();
    files.forEach(function (entry, index) {
      var li = document.createElement("li");
      li.className = "file-row";
      li.dataset.id = entry.id;

      var main = document.createElement("div");
      main.className = "file-main";
      var pos = document.createElement("span");
      pos.className = "file-position";
      pos.textContent = String(index + 1);
      var info = document.createElement("span");
      info.className = "file-info";
      var name = document.createElement("span");
      name.className = "file-name";
      name.textContent = entry.file.name;
      var size = document.createElement("span");
      size.className = "file-size";
      size.textContent = U.formatBytes(entry.file.size);
      info.append(name, size);
      main.append(pos, info);

      var controls = document.createElement("span");
      controls.className = "file-controls";
      [
        ["up", "↑", "Move up", index === 0],
        ["down", "↓", "Move down", index === files.length - 1],
        ["remove", "×", "Remove", false]
      ].forEach(function (spec) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "icon-button " + (spec[0] === "remove" ? "remove" : "");
        button.dataset.action = spec[0];
        button.textContent = spec[1];
        button.setAttribute("aria-label", spec[2] + " " + entry.file.name);
        button.disabled = busy || spec[3];
        controls.appendChild(button);
      });
      li.append(main, controls);
      el.list.appendChild(li);
    });

    el.count.textContent = files.length + (files.length === 1 ? " PDF selected" : " PDFs selected");
    el.merge.disabled = busy || files.length < 2;
    el.clear.disabled = busy || files.length === 0;
  }

  function add(collection) {
    if (busy) return;
    var incoming = Array.from(collection || []);
    if (!incoming.length) return;
    var invalid = incoming.find(function (file) { return !U.isPdf(file); });
    if (invalid) return U.setStatus(el.status, invalid.name + " is not a PDF.", "error");
    var large = incoming.find(function (file) { return file.size > MAX_FILE; });
    if (large) return U.setStatus(el.status, large.name + " is larger than 60 MB.", "error");
    if (U.totalSize(files.map(function (x) { return x.file; }).concat(incoming)) > MAX_TOTAL) {
      return U.setStatus(el.status, "Keep the combined selection below 150 MB for browser stability.", "error");
    }
    incoming.forEach(function (file) { files.push({ id: U.createId(), file: file }); });
    update();
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, files.length < 2 ? "Add at least one more PDF." : "Ready to merge. Use the arrows to set the final order.", files.length < 2 ? "info" : "success");
  }

  function clear() {
    if (busy) return;
    files = [];
    update();
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose at least two PDF files.", "info");
  }

  el.list.addEventListener("click", function (event) {
    if (busy) return;
    var button = event.target.closest("[data-action]");
    var row = button && button.closest("[data-id]");
    if (!row) return;
    var index = files.findIndex(function (entry) { return entry.id === row.dataset.id; });
    if (index < 0) return;
    var action = button.dataset.action;
    if (action === "remove") files.splice(index, 1);
    if (action === "up" && index > 0) files.splice(index - 1, 0, files.splice(index, 1)[0]);
    if (action === "down" && index < files.length - 1) files.splice(index + 1, 0, files.splice(index, 1)[0]);
    update();
    U.setStatus(el.status, files.length >= 2 ? "Order updated. Ready to merge." : "Choose at least two PDF files.", "info");
  });

  async function merge() {
    if (busy || files.length < 2) return;
    if (!window.PDFLib) return U.setStatus(el.status, "The PDF library did not load. Refresh and try again.", "error");
    busy = true;
    update();
    try {
      var output = await window.PDFLib.PDFDocument.create();
      var totalPages = 0;
      for (var i = 0; i < files.length; i += 1) {
        U.setStatus(el.status, "Reading " + (i + 1) + " of " + files.length + ": " + files[i].file.name, "info");
        var source = await window.PDFLib.PDFDocument.load(await files[i].file.arrayBuffer(), { updateMetadata: false });
        var indexes = source.getPageIndices();
        var pages = await output.copyPages(source, indexes);
        pages.forEach(function (page) { output.addPage(page); });
        totalPages += pages.length;
        U.setProgress(el.progress, ((i + 1) / files.length) * 88);
      }
      output.setTitle("Merged PDF");
      output.setCreator("FreePDF Tools");
      output.setProducer("FreePDF Tools using pdf-lib");
      var bytes = await output.save({ useObjectStreams: true });
      U.setProgress(el.progress, 98);
      U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, "Done — " + files.length + " PDFs and " + totalPages + " pages merged. Download started.", "success");
    } catch (error) {
      console.error(error);
      var message = String(error && error.message || "").toLowerCase();
      U.setProgress(el.progress, 0);
      U.setStatus(el.status, message.indexOf("encrypt") >= 0 ? "A password-protected PDF cannot be opened. Unlock it first and retry." : "Could not merge these PDFs. Check that every file is valid and try smaller files.", "error");
    } finally {
      busy = false;
      update();
    }
  }

  U.bindDropZone(el.zone, el.input, add);
  el.merge.addEventListener("click", merge);
  el.clear.addEventListener("click", clear);
  clear();
}());
