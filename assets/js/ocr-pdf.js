import * as pdfjsLib from "/assets/vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.mjs";

const U = window.FreePDF;
const MAX_FILE = 60 * U.MB;
const MAX_PAGES = 30;
const MAX_RENDER_PIXELS = 12000000;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL = "http://schemas.openxmlformats.org/package/2006/relationships";

const el = {
  zone: document.getElementById("dropZone"),
  input: document.getElementById("pdfFile"),
  summary: document.getElementById("fileSummary"),
  from: document.getElementById("fromPage"),
  to: document.getElementById("toPage"),
  ocr: document.getElementById("ocrButton"),
  copy: document.getElementById("copyButton"),
  downloadText: document.getElementById("downloadTextButton"),
  downloadDocx: document.getElementById("downloadDocxButton"),
  clear: document.getElementById("clearButton"),
  output: document.getElementById("textOutput"),
  progress: document.getElementById("progressBar"),
  status: document.getElementById("toolStatus")
};

let file = null;
let pdf = null;
let busy = false;
let worker = null;
let workerPromise = null;
let lastPages = [];

function xml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraph(text) {
  const value = String(text || "");
  if (!value) return "<w:p></w:p>";
  return '<w:p><w:r><w:t xml:space="preserve">' + xml(value) + "</w:t></w:r></w:p>";
}

function buildDocumentXml(pages) {
  const body = [];
  pages.forEach(function (page, index) {
    body.push(paragraph("Page " + page.number));
    String(page.text || "").split(/\r?\n/).forEach(function (line) {
      body.push(paragraph(line));
    });
    if (index < pages.length - 1) body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  });
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="' + W + '" xmlns:r="' + R + '">' +
    "<w:body>" + body.join("") +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>' +
    "</w:body></w:document>";
}

async function buildDocx(pages) {
  const zip = new window.JSZip();
  zip.file("[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    "</Types>"
  );
  zip.file("_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="' + REL + '">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    "</Relationships>"
  );
  zip.file("word/document.xml", buildDocumentXml(pages));
  zip.file("word/styles.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="' + W + '">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    "</w:styles>"
  );
  zip.file("word/_rels/document.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="' + REL + '"></Relationships>'
  );
  zip.file("docProps/core.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    "<dc:title>OCR converted PDF</dc:title><dc:creator>FreePDF Tools</dc:creator><cp:lastModifiedBy>FreePDF Tools</cp:lastModifiedBy>" +
    "</cp:coreProperties>"
  );
  zip.file("docProps/app.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
    "<Application>FreePDF Tools</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>" +
    "</Properties>"
  );
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: DOCX_MIME });
  return blob.type === DOCX_MIME ? blob : new Blob([blob], { type: DOCX_MIME });
}

function pageRange() {
  const from = Number.parseInt(el.from.value, 10);
  const to = Number.parseInt(el.to.value, 10);
  return pdf && Number.isFinite(from) && Number.isFinite(to) && from >= 1 && to <= pdf.numPages && from <= to
    ? { from, to }
    : null;
}

function update() {
  el.summary.textContent = file && pdf
    ? file.name + " · " + pdf.numPages + " pages · " + U.formatBytes(file.size)
    : "No PDF selected";
  const hasOutput = Boolean(el.output.value.trim());
  el.ocr.disabled = busy || !pdf;
  el.copy.disabled = busy || !hasOutput;
  el.downloadText.disabled = busy || !hasOutput;
  el.downloadDocx.disabled = busy || !hasOutput;
  el.clear.disabled = busy || !file;
  el.input.disabled = busy;
  el.from.disabled = busy || !pdf;
  el.to.disabled = busy || !pdf;
}

async function destroyPdf() {
  if (pdf) {
    try { await pdf.destroy(); } catch (_) {}
  }
  pdf = null;
}

async function destroyWorker() {
  if (worker) {
    try { await worker.terminate(); } catch (_) {}
  }
  worker = null;
  workerPromise = null;
}

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  if (workerPromise) return workerPromise;
  workerPromise = new Promise(function (resolve, reject) {
    const script = document.createElement("script");
    script.src = "/assets/vendor/tesseract/tesseract.min.js";
    script.async = true;
    script.onload = function () { resolve(window.Tesseract); };
    script.onerror = function () {
      workerPromise = null;
      reject(new Error("The local OCR engine could not be loaded."));
    };
    document.head.appendChild(script);
  });
  return workerPromise;
}

async function getWorker() {
  const Tesseract = await loadTesseract();
  if (worker) return worker;
  worker = await Tesseract.createWorker("eng", 1, {
    workerPath: "/assets/vendor/tesseract/worker.min.js",
    corePath: "/assets/vendor/tesseract/core",
    langPath: "/assets/vendor/tesseract/lang",
    cachePath: "freepdf-ocr",
    cacheMethod: "write",
    logger: function (message) {
      if (!message || !Number.isFinite(message.progress)) return;
      const text = message.status ? String(message.status).replace(/^./, (c) => c.toUpperCase()) : "Recognizing text";
      U.setStatus(el.status, text + "…", "info");
    }
  });
  return worker;
}

async function select(collection) {
  if (busy) return;
  const next = Array.from(collection || [])[0];
  if (!next) return;
  if (!U.isPdf(next)) return U.setStatus(el.status, "Choose a PDF file.", "error");
  if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 60 MB for browser stability.", "error");

  busy = true;
  update();
  U.setProgress(el.progress, 4);

  try {
    await destroyPdf();
    const data = new Uint8Array(await next.arrayBuffer());
    const nextPdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
    file = next;
    pdf = nextPdf;
    el.output.value = "";
    el.from.value = "1";
    el.to.value = String(Math.min(pdf.numPages, MAX_PAGES));
    el.from.max = String(pdf.numPages);
    el.to.max = String(pdf.numPages);
    U.setProgress(el.progress, 100);
    U.setStatus(el.status, pdf.numPages > MAX_PAGES
      ? "PDF loaded. OCR works in batches of " + MAX_PAGES + " pages for browser stability."
      : pdf.numPages + " pages loaded. OCR is ready.", "success");
  } catch (error) {
    console.error(error);
    file = null;
    await destroyPdf();
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Could not open this PDF. Password-protected or damaged files may not work.", "error");
  } finally {
    busy = false;
    update();
  }
}

async function renderPage(page) {
  const baseViewport = page.getViewport({ scale: 1 });
  let scale = 2;
  const pixels = baseViewport.width * baseViewport.height * scale * scale;
  if (pixels > MAX_RENDER_PIXELS) scale *= Math.sqrt(MAX_RENDER_PIXELS / pixels);
  const viewport = page.getViewport({ scale: Math.max(1, scale) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, background: "#ffffff" }).promise;
  return canvas;
}

async function runOcr() {
  if (busy || !pdf) return;
  const range = pageRange();
  if (!range) return U.setStatus(el.status, "Enter a valid page range between 1 and " + pdf.numPages + ".", "error");
  if (range.to - range.from + 1 > MAX_PAGES) return U.setStatus(el.status, "OCR at most " + MAX_PAGES + " pages at a time to protect browser memory.", "error");

  busy = true;
  update();
  lastPages = [];
  U.setProgress(el.progress, 1);

  try {
    const ocrWorker = await getWorker();
    const total = range.to - range.from + 1;

    for (let number = range.from; number <= range.to; number += 1) {
      const page = await pdf.getPage(number);
      let canvas = null;
      try {
        U.setStatus(el.status, "Rendering page " + number + " of " + range.to + "…", "info");
        canvas = await renderPage(page);
        U.setStatus(el.status, "OCR on page " + number + " of " + range.to + "…", "info");
        const result = await ocrWorker.recognize(canvas);
        lastPages.push({ number: number, text: String(result.data && result.data.text || "").trim() });
      } finally {
        if (canvas) {
          canvas.width = 1;
          canvas.height = 1;
        }
        page.cleanup();
      }
      U.setProgress(el.progress, ((number - range.from + 1) / total) * 96);
    }

    const output = lastPages.map((page) => "--- Page " + page.number + " ---\n" + page.text).join("\n\n");
    el.output.value = output.trim();
    const characters = el.output.value.replace(/--- Page \d+ ---/g, "").trim().length;
    U.setProgress(el.progress, 100);
    U.setStatus(el.status, characters
      ? "OCR complete — recognized about " + characters.toLocaleString() + " text characters. Review the result before relying on it."
      : "OCR completed but no text was recognized. Try a clearer scan or higher-quality source PDF.", characters ? "success" : "warning");
  } catch (error) {
    console.error(error);
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, error && error.message ? error.message : "OCR failed. Try a smaller page range or clearer scan.", "error");
  } finally {
    busy = false;
    update();
  }
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(el.output.value);
    U.setStatus(el.status, "OCR text copied to the clipboard.", "success");
  } catch {
    el.output.select();
    U.setStatus(el.status, "Clipboard access was blocked. The OCR text is selected so you can copy it.", "warning");
  }
}

function downloadText() {
  const base = U.safeBaseName(file && file.name);
  U.downloadBlob(new Blob([el.output.value], { type: "text/plain;charset=utf-8" }), base + "-ocr.txt");
  U.setStatus(el.status, "Text download started.", "success");
}

async function downloadDocx() {
  if (!el.output.value.trim()) return;
  busy = true;
  update();
  try {
    const blob = await buildDocx(lastPages);
    U.downloadBlob(blob, U.safeBaseName(file && file.name) + "-ocr.docx");
    U.setStatus(el.status, "Editable OCR DOCX download started. Review the text and layout in Word.", "success");
  } catch (error) {
    console.error(error);
    U.setStatus(el.status, "Could not build the OCR DOCX file.", "error");
  } finally {
    busy = false;
    update();
  }
}

function clear() {
  if (busy) return;
  file = null;
  lastPages = [];
  el.output.value = "";
  el.to.value = "";
  U.setProgress(el.progress, 0);
  U.setStatus(el.status, "Choose a scanned or image-only PDF to begin.", "info");
  update();
}

U.bindDropZone(el.zone, el.input, select);
el.ocr.addEventListener("click", runOcr);
el.copy.addEventListener("click", copyText);
el.downloadText.addEventListener("click", downloadText);
el.downloadDocx.addEventListener("click", downloadDocx);
el.clear.addEventListener("click", clear);
window.addEventListener("pagehide", function () { destroyWorker(); destroyPdf(); });
clear();
