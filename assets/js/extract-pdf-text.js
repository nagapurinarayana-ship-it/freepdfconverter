import * as pdfjsLib from "/assets/vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.mjs";
const U = window.FreePDF; const MAX_FILE = 120 * U.MB; let file = null; let pdf = null; let busy = false;
const el = { zone: document.getElementById("dropZone"), input: document.getElementById("pdfFile"), summary: document.getElementById("fileSummary"), from: document.getElementById("fromPage"), to: document.getElementById("toPage"), extract: document.getElementById("extractButton"), copy: document.getElementById("copyButton"), download: document.getElementById("downloadButton"), clear: document.getElementById("clearButton"), output: document.getElementById("textOutput"), progress: document.getElementById("progressBar"), status: document.getElementById("toolStatus") };

async function select(collection) {
  if (busy) return; const next = Array.from(collection || [])[0]; if (!next) return;
  if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
  if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 120 MB for browser stability.", "error");
  busy = true; update();
  try {
    const data = new Uint8Array(await next.arrayBuffer()); pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise; file = next;
    el.from.value = "1"; el.to.value = String(pdf.numPages); el.from.max = String(pdf.numPages); el.to.max = String(pdf.numPages); el.output.value = "";
    U.setStatus(el.status, "Ready to extract selectable text from " + pdf.numPages + " pages.", "success");
  } catch (error) { console.error(error); file = null; pdf = null; U.setStatus(el.status, "Could not read this PDF. Password-protected or damaged files may not work.", "error"); }
  finally { busy = false; update(); }
}
function update() { el.summary.textContent = file && pdf ? file.name + " · " + pdf.numPages + " pages · " + U.formatBytes(file.size) : "No PDF selected"; el.extract.disabled = busy || !pdf; el.copy.disabled = busy || !el.output.value; el.download.disabled = busy || !el.output.value; el.clear.disabled = busy || !file; }
function range() { const from = Number.parseInt(el.from.value, 10); const to = Number.parseInt(el.to.value, 10); return { from, to, valid: pdf && from >= 1 && to <= pdf.numPages && from <= to }; }
function pageText(items) {
  const lines = []; let current = []; let currentY = null;
  items.forEach(function (item) {
    const text = String(item.str || "").trim(); if (!text) { if (item.hasEOL && current.length) { lines.push(current.join(" ")); current = []; currentY = null; } return; }
    const y = item.transform && Number(item.transform[5]);
    if (currentY !== null && Number.isFinite(y) && Math.abs(y - currentY) > 3 && current.length) { lines.push(current.join(" ")); current = []; }
    current.push(text); if (Number.isFinite(y)) currentY = y;
    if (item.hasEOL) { lines.push(current.join(" ")); current = []; currentY = null; }
  });
  if (current.length) lines.push(current.join(" ")); return lines.join("\n");
}
async function extract() {
  if (busy || !pdf) return; const r = range(); if (!r.valid) return U.setStatus(el.status, "Enter a valid page range between 1 and " + pdf.numPages + ".", "error");
  busy = true; update(); const sections = []; const total = r.to - r.from + 1;
  try {
    for (let number = r.from; number <= r.to; number += 1) {
      U.setStatus(el.status, "Reading text from page " + number + " of " + r.to + "…", "info"); const page = await pdf.getPage(number); const content = await page.getTextContent(); const text = pageText(content.items);
      sections.push("--- Page " + number + " ---\n" + text); U.setProgress(el.progress, ((number - r.from + 1) / total) * 100);
    }
    el.output.value = sections.join("\n\n"); const characters = el.output.value.replace(/--- Page \d+ ---/g, "").trim().length;
    U.setStatus(el.status, characters ? "Done — extracted " + characters.toLocaleString() + " text characters." : "No selectable text was found. Scanned pages need OCR, which this tool does not perform.", characters ? "success" : "warning");
  } catch (error) { console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not extract text from this PDF.", "error"); }
  finally { busy = false; update(); }
}
async function copyText() { try { await navigator.clipboard.writeText(el.output.value); U.setStatus(el.status, "Extracted text copied to the clipboard.", "success"); } catch { el.output.select(); U.setStatus(el.status, "Clipboard access was blocked. The text is selected so you can copy it.", "warning"); } }
function downloadText() { U.downloadBlob(new Blob([el.output.value], { type: "text/plain;charset=utf-8" }), U.safeBaseName(file && file.name) + "-text.txt"); U.setStatus(el.status, "Text download started.", "success"); }
function clear() { if (busy) return; file = null; pdf = null; el.output.value = ""; el.to.value = ""; update(); U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose one text-based PDF.", "info"); }
U.bindDropZone(el.zone, el.input, select); el.extract.addEventListener("click", extract); el.copy.addEventListener("click", copyText); el.download.addEventListener("click", downloadText); el.clear.addEventListener("click", clear); clear();
