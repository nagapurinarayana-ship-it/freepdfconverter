(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 120 * U.MB;
  var file = null;
  var pages = [];
  var busy = false;
  var el = {
    zone: document.getElementById("dropZone"), input: document.getElementById("pdfFile"),
    summary: document.getElementById("fileSummary"), list: document.getElementById("pageList"),
    save: document.getElementById("saveButton"), reset: document.getElementById("resetButton"),
    clear: document.getElementById("clearButton"), progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };

  async function select(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0];
    if (!next) return;
    if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");
    if (!window.PDFLib) return U.setStatus(el.status, "The PDF library did not load. Refresh and retry.", "error");
    busy = true; update();
    try {
      var source = await window.PDFLib.PDFDocument.load(await next.arrayBuffer(), { updateMetadata: false });
      file = next;
      pages = source.getPageIndices().map(function (index) { return { id: U.createId(), originalIndex: index }; });
      U.setStatus(el.status, "Ready. Reorder or remove pages, then save the organized PDF.", "success");
      U.setProgress(el.progress, 0);
    } catch (error) {
      console.error(error); file = null; pages = [];
      U.setStatus(el.status, "Could not open this PDF. Password-protected or damaged files may not work.", "error");
    } finally { busy = false; update(); }
  }

  function update() {
    el.list.replaceChildren();
    pages.forEach(function (entry, index) {
      var li = document.createElement("li"); li.className = "file-row"; li.dataset.id = entry.id;
      var main = document.createElement("div"); main.className = "file-main";
      var pos = document.createElement("span"); pos.className = "file-position"; pos.textContent = String(index + 1);
      var info = document.createElement("span"); info.className = "file-info";
      var name = document.createElement("span"); name.className = "file-name"; name.textContent = "Original page " + (entry.originalIndex + 1);
      var detail = document.createElement("span"); detail.className = "file-size"; detail.textContent = "Output position " + (index + 1);
      info.append(name, detail); main.append(pos, info);
      var controls = document.createElement("span"); controls.className = "file-controls";
      [["first", "⇤", "Move to first", index === 0], ["up", "↑", "Move up", index === 0], ["down", "↓", "Move down", index === pages.length - 1], ["last", "⇥", "Move to last", index === pages.length - 1], ["remove", "×", "Remove page", pages.length === 1]].forEach(function (spec) {
        var button = document.createElement("button"); button.type = "button"; button.className = "icon-button" + (spec[0] === "remove" ? " remove" : "");
        button.dataset.action = spec[0]; button.textContent = spec[1]; button.title = spec[2]; button.setAttribute("aria-label", spec[2] + " " + (entry.originalIndex + 1)); button.disabled = busy || spec[3]; controls.appendChild(button);
      });
      li.append(main, controls); el.list.appendChild(li);
    });
    el.summary.innerHTML = file ? "<strong>" + escapeHtml(file.name) + "</strong> · " + pages.length + " page" + (pages.length === 1 ? "" : "s") + " in output" : "No PDF selected";
    el.save.disabled = busy || !file || !pages.length; el.reset.disabled = busy || !file; el.clear.disabled = busy || !file;
  }

  function reset() {
    if (!file || busy) return;
    pages.sort(function (a, b) { return a.originalIndex - b.originalIndex; });
    update(); U.setStatus(el.status, "Original page order restored.", "info");
  }

  function clear() {
    if (busy) return; file = null; pages = []; update(); U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose one PDF to organize.", "info");
  }

  el.list.addEventListener("click", function (event) {
    if (busy) return;
    var button = event.target.closest("[data-action]"); var row = button && button.closest("[data-id]"); if (!row) return;
    var index = pages.findIndex(function (entry) { return entry.id === row.dataset.id; }); if (index < 0) return;
    var page = pages[index]; var action = button.dataset.action;
    if (action === "remove" && pages.length > 1) pages.splice(index, 1);
    if (action === "up" && index > 0) pages.splice(index - 1, 0, pages.splice(index, 1)[0]);
    if (action === "down" && index < pages.length - 1) pages.splice(index + 1, 0, pages.splice(index, 1)[0]);
    if (action === "first" && index > 0) { pages.splice(index, 1); pages.unshift(page); }
    if (action === "last" && index < pages.length - 1) { pages.splice(index, 1); pages.push(page); }
    update(); U.setStatus(el.status, "Page order updated. " + pages.length + " pages will be saved.", "info");
  });

  async function save() {
    if (busy || !file || !pages.length) return;
    busy = true; update();
    try {
      U.setStatus(el.status, "Copying pages in the new order…", "info"); U.setProgress(el.progress, 20);
      var source = await window.PDFLib.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
      var output = await window.PDFLib.PDFDocument.create();
      var copied = await output.copyPages(source, pages.map(function (entry) { return entry.originalIndex; }));
      copied.forEach(function (page) { output.addPage(page); }); U.setProgress(el.progress, 75);
      var bytes = await output.save({ useObjectStreams: true });
      U.downloadBlob(new Blob([bytes], { type: "application/pdf" }), U.safeBaseName(file.name) + "-organized.pdf");
      U.setProgress(el.progress, 100); U.setStatus(el.status, "Done — saved " + pages.length + " organized pages.", "success");
    } catch (error) {
      console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not organize this PDF. Try a smaller, unlocked file.", "error");
    } finally { busy = false; update(); }
  }

  function escapeHtml(value) { var node = document.createElement("span"); node.textContent = value; return node.innerHTML; }
  U.bindDropZone(el.zone, el.input, select); el.save.addEventListener("click", save); el.reset.addEventListener("click", reset); el.clear.addEventListener("click", clear); clear();
}());
