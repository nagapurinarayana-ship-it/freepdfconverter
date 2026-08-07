import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs";

const U = window.FreePDF;
const MAX_FILE = 60 * U.MB;
let pdf = null;
let file = null;
let busy = false;
const el = {
  zone: document.getElementById("dropZone"), input: document.getElementById("pdfFile"),
  selected: document.getElementById("selectedFile"), pages: document.getElementById("pageCount"),
  from: document.getElementById("fromPage"), to: document.getElementById("toPage"),
  format: document.getElementById("imageFormat"), scale: document.getElementById("renderScale"),
  quality: document.getElementById("jpegQuality"), qualityField: document.getElementById("qualityField"),
  convert: document.getElementById("convertButton"), clear: document.getElementById("clearButton"),
  progress: document.getElementById("progressBar"), status: document.getElementById("toolStatus")
};

function controls() {
  el.input.disabled = busy; el.convert.disabled = busy || !pdf; el.clear.disabled = busy || !pdf;
  el.quality.disabled = busy || el.format.value !== "jpeg"; el.qualityField.hidden = el.format.value !== "jpeg";
}
async function destroyPdf() { if (pdf) { try { await pdf.destroy(); } catch (_) {} } pdf = null; }
async function reset() {
  await destroyPdf(); file = null; el.selected.textContent = "No PDF selected"; el.pages.textContent = "0";
  el.from.value = "1"; el.to.value = "1"; U.setProgress(el.progress,0); U.setStatus(el.status,"Choose a PDF and select image quality.","info"); controls();
}
async function load(collection) {
  if (busy) return;
  const next = Array.from(collection || [])[0]; if (!next) return;
  if (!U.isPdf(next)) return U.setStatus(el.status,"Please choose a PDF file.","error");
  if (next.size > MAX_FILE) return U.setStatus(el.status,"Keep the PDF below 60 MB for browser stability.","error");
  busy = true; controls(); U.setProgress(el.progress,5); U.setStatus(el.status,"Rendering engine is reading the PDF…","info");
  try {
    await destroyPdf();
    const data = new Uint8Array(await next.arrayBuffer());
    pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
    file = next; el.selected.textContent = next.name + " · " + U.formatBytes(next.size);
    el.pages.textContent = String(pdf.numPages); el.from.value = "1"; el.to.value = String(pdf.numPages);
    U.setProgress(el.progress,100); U.setStatus(el.status,pdf.numPages + " pages loaded. Choose a range and convert.","success");
  } catch (error) {
    console.error(error); await reset(); U.setStatus(el.status,"Could not open this PDF. It may be encrypted or invalid.","error");
  } finally { busy = false; controls(); }
}
function range() {
  const from = Math.floor(Number(el.from.value)); const to = Math.floor(Number(el.to.value));
  if (!pdf || !Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to > pdf.numPages || from > to) return null;
  if (to - from + 1 > 60) return "too-many";
  return { from, to };
}
function canvasBlob(canvas, type, quality) {
  return new Promise((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Canvas export failed")),type,quality));
}
async function convert() {
  if (busy || !pdf || !file) return;
  const r = range();
  if (r === "too-many") return U.setStatus(el.status,"Convert at most 60 pages at a time to protect browser memory.","error");
  if (!r) return U.setStatus(el.status,"Enter a valid page range.","error");
  if (!window.JSZip && r.to > r.from) return U.setStatus(el.status,"The ZIP library did not load. Refresh and retry.","error");
  busy = true; controls(); U.setProgress(el.progress,2);
  try {
    const format = el.format.value; const mime = format === "png" ? "image/png" : "image/jpeg";
    const extension = format === "png" ? "png" : "jpg"; const scale = Number(el.scale.value) || 1.5;
    const quality = Math.max(.5,Math.min(1,Number(el.quality.value) || .9)); const total = r.to - r.from + 1;
    const zip = total > 1 ? new window.JSZip() : null; let onlyBlob = null;
    for (let number = r.from; number <= r.to; number += 1) {
      U.setStatus(el.status,"Rendering page " + number + " of " + r.to + "…","info");
      const page = await pdf.getPage(number); const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d",{ alpha: format === "png" });
      if (format !== "png") { context.fillStyle = "#ffffff"; context.fillRect(0,0,canvas.width,canvas.height); }
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await canvasBlob(canvas,mime,quality);
      const name = U.safeBaseName(file.name) + "-page-" + String(number).padStart(3,"0") + "." + extension;
      if (zip) zip.file(name,blob); else onlyBlob = blob;
      canvas.width = 1; canvas.height = 1; page.cleanup();
      U.setProgress(el.progress,((number-r.from+1)/total)*90);
    }
    if (zip) {
      U.setStatus(el.status,"Packaging images into ZIP…","info");
      const blob = await zip.generateAsync({ type: "blob" },meta => U.setProgress(el.progress,90+meta.percent*.1));
      U.downloadBlob(blob,U.safeBaseName(file.name)+"-"+extension+"-pages.zip");
    } else {
      U.downloadBlob(onlyBlob,U.safeBaseName(file.name)+"-page-"+String(r.from).padStart(3,"0")+"."+extension);
    }
    U.setProgress(el.progress,100); U.setStatus(el.status,total + " page" + (total === 1 ? "" : "s") + " converted. Download started.","success");
  } catch (error) {
    console.error(error); U.setProgress(el.progress,0); U.setStatus(el.status,"Could not render these pages. Try a smaller range or lower quality.","error");
  } finally { busy = false; controls(); }
}
U.bindDropZone(el.zone,el.input,load);
el.format.addEventListener("change",controls); el.convert.addEventListener("click",convert); el.clear.addEventListener("click",reset);
reset();
