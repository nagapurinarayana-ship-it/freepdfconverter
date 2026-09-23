import * as pdfjsLib from "/assets/vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.mjs";

const U = window.FreePDF;
const MAX_FILE = 60 * U.MB;
const MAX_PAGES = 120;
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL = "http://schemas.openxmlformats.org/package/2006/relationships";

const el = {
  zone: document.getElementById("dropZone"),
  input: document.getElementById("pdfFile"),
  summary: document.getElementById("fileSummary"),
  from: document.getElementById("fromPage"),
  to: document.getElementById("toPage"),
  convert: document.getElementById("convertButton"),
  clear: document.getElementById("clearButton"),
  progress: document.getElementById("progressBar"),
  status: document.getElementById("toolStatus")
};

let file = null;
let pdf = null;
let busy = false;

function xml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraph(text, style) {
  const value = String(text || "");
  const escaped = xml(value);
  const pPr = style ? '<w:pPr><w:pStyle w:val="' + xml(style) + '"/></w:pPr>' : "";
  if (!value) return "<w:p>" + pPr + "</w:p>";
  return "<w:p>" + pPr + '<w:r><w:t xml:space="preserve">' + escaped + "</w:t></w:r></w:p>";
}

function buildDocumentXml(pages) {
  const body = [];
  pages.forEach(function (page, index) {
    page.lines.forEach(function (line) { body.push(paragraph(line)); });
    if (index < pages.length - 1) {
      body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    }
  });
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="' + W + '" xmlns:r="' + R + '">' +
      "<w:body>" + body.join("") +
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>' +
      "</w:body>" +
    "</w:document>";
}

function buildDocx(pages) {
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
      '<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    "</w:styles>"
  );
  zip.file("word/_rels/document.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="' + REL + '"></Relationships>'
  );
  zip.file("docProps/core.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      "<dc:title>Converted PDF document</dc:title><dc:creator>FreePDF Tools</dc:creator><cp:lastModifiedBy>FreePDF Tools</cp:lastModifiedBy>" +
    "</cp:coreProperties>"
  );
  zip.file("docProps/app.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      "<Application>FreePDF Tools</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>" +
    "</Properties>"
  );
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

function pageText(items) {
  const lines = [];
  let current = [];
  let currentY = null;

  items.forEach(function (item) {
    const text = String(item.str || "").replace(/\s+/g, " ").trim();
    if (!text) {
      if (item.hasEOL && current.length) {
        lines.push(current.join(" "));
        current = [];
        currentY = null;
      }
      return;
    }
    const y = item.transform && Number(item.transform[5]);
    if (currentY !== null && Number.isFinite(y) && Math.abs(y - currentY) > 3 && current.length) {
      lines.push(current.join(" "));
      current = [];
    }
    current.push(text);
    if (Number.isFinite(y)) currentY = y;
    if (item.hasEOL) {
      lines.push(current.join(" "));
      current = [];
      currentY = null;
    }
  });

  if (current.length) lines.push(current.join(" "));
  return lines;
}

function range() {
  const from = Math.floor(Number(el.from.value));
  const to = Math.floor(Number(el.to.value));
  if (!pdf || !Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to > pdf.numPages || from > to) return null;
  if (to - from + 1 > MAX_PAGES) return "too-many";
  return { from, to };
}

function update() {
  el.summary.textContent = file && pdf ? file.name + " · " + pdf.numPages + " pages · " + U.formatBytes(file.size) : "No PDF selected";
  el.convert.disabled = busy || !pdf;
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

async function load(collection) {
  if (busy) return;
  const next = Array.from(collection || [])[0];
  if (!next) return;
  if (!U.isPdf(next)) return U.setStatus(el.status, "Please choose a PDF file.", "error");
  if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the PDF below 60 MB for browser stability.", "error");

  busy = true;
  update();
  U.setProgress(el.progress, 4);
  U.setStatus(el.status, "Reading the PDF locally…", "info");

  try {
    await destroyPdf();
    pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(await next.arrayBuffer()),
      isEvalSupported: false
    }).promise;
    file = next;
    el.from.value = "1";
    el.to.value = String(pdf.numPages);
    el.from.max = String(pdf.numPages);
    el.to.max = String(pdf.numPages);
    U.setProgress(el.progress, 100);
    U.setStatus(el.status, pdf.numPages + " pages loaded. Choose a range or convert the whole document.", "success");
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

async function convert() {
  if (busy || !pdf || !file) return;
  if (!window.JSZip) return U.setStatus(el.status, "The DOCX packaging library did not load. Refresh and retry.", "error");

  const selected = range();
  if (selected === "too-many") return U.setStatus(el.status, "Convert at most " + MAX_PAGES + " pages at a time to protect browser memory.", "error");
  if (!selected) return U.setStatus(el.status, "Enter a valid page range.", "error");

  busy = true;
  update();
  U.setProgress(el.progress, 2);

  try {
    const pages = [];
    const total = selected.to - selected.from + 1;

    for (let number = selected.from; number <= selected.to; number += 1) {
      U.setStatus(el.status, "Extracting text from page " + number + " of " + selected.to + "…", "info");
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      pages.push({ number: number, lines: pageText(content.items) });
      page.cleanup();
      U.setProgress(el.progress, ((number - selected.from + 1) / total) * 78);
    }

    U.setStatus(el.status, "Building an editable DOCX file…", "info");
    const blob = await buildDocx(pages);
    const suffix = selected.from === 1 && selected.to === pdf.numPages ? "" : "-pages-" + selected.from + "-to-" + selected.to;
    const name = U.safeBaseName(file.name) + suffix + ".docx";
    U.downloadBlob(blob, name);

    U.setProgress(el.progress, 100);
    U.setStatus(el.status, "DOCX created: " + name + ". Download started.", "success");
  } catch (error) {
    console.error(error);
    U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Could not create the Word file. Text-based PDFs work best.", "error");
  } finally {
    busy = false;
    update();
  }
}

async function clear() {
  if (busy) return;
  await destroyPdf();
  file = null;
  el.from.value = "1";
  el.to.value = "";
  U.setProgress(el.progress, 0);
  U.setStatus(el.status, "Choose a text-based PDF.", "info");
  update();
}

U.bindDropZone(el.zone, el.input, load);
el.convert.addEventListener("click", convert);
el.clear.addEventListener("click", clear);
el.from.addEventListener("change", function () { if (pdf) U.setStatus(el.status, "Page range updated.", "info"); });
el.to.addEventListener("change", function () { if (pdf) U.setStatus(el.status, "Page range updated.", "info"); });
clear();