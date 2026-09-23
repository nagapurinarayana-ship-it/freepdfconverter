(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 40 * U.MB;
  var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  var blocks = [];
  var file = null;
  var busy = false;

  var el = {
    zone: document.getElementById("dropZone"),
    input: document.getElementById("wordFile"),
    summary: document.getElementById("fileSummary"),
    pageSize: document.getElementById("pageSize"),
    fontSize: document.getElementById("fontSize"),
    filename: document.getElementById("outputFilename"),
    convert: document.getElementById("convertButton"),
    clear: document.getElementById("clearButton"),
    progress: document.getElementById("progressBar"),
    status: document.getElementById("toolStatus")
  };

  function ext(next) {
    return String(next && next.name || "").toLowerCase().split(".").pop();
  }

  function isSupported(next) {
    return next instanceof File && ["doc", "docx", "docm", "dot", "dotx", "dotm", "odt", "rtf", "txt", "html", "htm"].indexOf(ext(next)) !== -1;
  }

  function nodeText(node) {
    if (!node) return "";
    var out = "";
    Array.from(node.childNodes || []).forEach(function (child) {
      if (child.nodeType !== 1) return;
      if (child.namespaceURI === W && child.localName === "t") out += child.textContent || "";
      else if (child.namespaceURI === W && child.localName === "tab") out += "    ";
      else if (child.namespaceURI === W && (child.localName === "br" || child.localName === "cr")) out += "\n";
      else out += nodeText(child);
    });
    return out;
  }

  function attr(element, localName) {
    if (!element) return "";
    return element.getAttributeNS(W, localName) || element.getAttribute("w:" + localName) || "";
  }

  function paragraphStyle(p) {
    var props = Array.from(p.children || []).find(function (child) {
      return child.namespaceURI === W && child.localName === "pPr";
    });
    if (!props) return "";
    var style = Array.from(props.children || []).find(function (child) {
      return child.namespaceURI === W && child.localName === "pStyle";
    });
    return attr(style, "val");
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/\u2022/g, "*")
      .replace(/\u20b9/g, "Rs.")
      .replace(/[^\x20-\x7E\xA0-\xFF\n\t]/g, "?");
  }

  function makeBlocks(lines) {
    return String(lines || "").split(/\r?\n/).map(function (line) {
      return { text: cleanText(line).trimEnd(), style: "" };
    }).filter(function (block) { return block.text || block.style; });
  }

  async function parseDocx(next) {
    var zip = await window.JSZip.loadAsync(await next.arrayBuffer());
    var entry = zip.file("word/document.xml");
    if (!entry) throw new Error("document.xml not found");
    var xml = await entry.async("text");
    var parsed = new DOMParser().parseFromString(xml, "application/xml");
    if (parsed.getElementsByTagName("parsererror").length) throw new Error("Invalid Word XML");
    var body = parsed.getElementsByTagNameNS(W, "body")[0];
    if (!body) throw new Error("Word body not found");
    var result = [];
    Array.from(body.children || []).forEach(function (child) {
      if (child.namespaceURI !== W) return;
      if (child.localName === "p") {
        var text = cleanText(nodeText(child)).replace(/[ \t]+\n/g, "\n").trimEnd();
        var style = paragraphStyle(child).toLowerCase();
        if (text || style) result.push({ text: text, style: style });
      } else if (child.localName === "tbl") {
        Array.from(child.getElementsByTagNameNS(W, "tr")).forEach(function (row) {
          var cells = Array.from(row.children || []).filter(function (node) {
            return node.namespaceURI === W && node.localName === "tc";
          }).map(function (cell) {
            return cleanText(nodeText(cell)).replace(/\s+/g, " ").trim();
          });
          if (cells.some(Boolean)) result.push({ text: cells.join("  |  "), style: "table" });
        });
      }
    });
    if (!result.length) throw new Error("No readable text found");
    return result;
  }

  async function parseOdt(next) {
    var zip = await window.JSZip.loadAsync(await next.arrayBuffer());
    var entry = zip.file("content.xml");
    if (!entry) throw new Error("ODT content.xml not found");
    var xml = await entry.async("text");
    var parsed = new DOMParser().parseFromString(xml, "application/xml");
    if (parsed.getElementsByTagName("parsererror").length) throw new Error("Invalid ODT XML");
    var text = parsed.documentElement.textContent || "";
    return makeBlocks(text.replace(/\s+\n/g, "\n"));
  }

  function decodeRtf(input) {
    var text = String(input || "");
    text = text.replace(/\\'[0-9a-fA-F]{2}/g, function (m) { return String.fromCharCode(parseInt(m.slice(2), 16)); });
    text = text.replace(/\\u(-?\d+)\??/g, function (_, n) { var code = Number(n); return String.fromCharCode(code < 0 ? code + 65536 : code); });
    text = text.replace(/\\(par|line)\b/g, "\n").replace(/\\tab\b/g, "\t");
    text = text.replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, "");
    return makeBlocks(text);
  }

  async function parseLegacyDoc(next) {
    var mod = await import("https://cdn.jsdelivr.net/npm/@file-viewer/doc@3.1.2/+esm");
    if (!mod || typeof mod.parseMsDocToHtml !== "function") throw new Error("Legacy DOC parser unavailable");
    var rendered = mod.parseMsDocToHtml(await next.arrayBuffer());
    var parsed = new DOMParser().parseFromString(rendered.html || String(rendered || ""), "text/html");
    var text = parsed.body ? parsed.body.innerText : parsed.documentElement.textContent;
    return makeBlocks(text);
  }

  async function parseDocument(next) {
    var type = ext(next);
    if (["docx", "docm", "dotx", "dotm"].indexOf(type) !== -1) return parseDocx(next);
    if (type === "doc" || type === "dot") return parseLegacyDoc(next);
    if (type === "odt") return parseOdt(next);
    if (type === "rtf") return decodeRtf(await next.text());
    if (type === "txt") return makeBlocks(await next.text());
    if (type === "html" || type === "htm") {
      var parsed = new DOMParser().parseFromString(await next.text(), "text/html");
      return makeBlocks(parsed.body ? parsed.body.innerText : parsed.documentElement.textContent);
    }
    throw new Error("Unsupported document format");
  }

  function fontSizeFor(style) {
    if (/heading1|title/.test(style)) return 20;
    if (/heading2/.test(style)) return 16;
    if (/heading3/.test(style)) return 14;
    return Number(el.fontSize.value) || 12;
  }

  function pageSpec() {
    return el.pageSize.value === "Letter" ? { width: 612, height: 792 } : { width: 595.28, height: 841.89 };
  }

  function wrapText(text, font, size, maxWidth) {
    var lines = [];
    String(text || "").split("\n").forEach(function (logicalLine) {
      if (!logicalLine) { lines.push(""); return; }
      var words = logicalLine.split(/\s+/), current = "";
      words.forEach(function (word) {
        var candidate = current ? current + " " + word : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) { current = candidate; return; }
        if (current) lines.push(current);
        if (font.widthOfTextAtSize(word, size) <= maxWidth) { current = word; return; }
        var chunk = "";
        Array.from(word).forEach(function (char) {
          var test = chunk + char;
          if (font.widthOfTextAtSize(test, size) <= maxWidth) chunk = test;
          else { if (chunk) lines.push(chunk); chunk = char; }
        });
        current = chunk;
      });
      if (current) lines.push(current);
    });
    return lines;
  }

  async function createPdf() {
    if (!blocks.length) throw new Error("No document loaded");
    if (!window.PDFLib) throw new Error("PDF library unavailable");
    var spec = pageSpec(), margin = 54, contentWidth = spec.width - margin * 2;
    var doc = await window.PDFLib.PDFDocument.create();
    var font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    var pages = 0, page = null, cursorY = 0;
    function newPage() { page = doc.addPage([spec.width, spec.height]); cursorY = spec.height - margin; pages += 1; }
    function ensureSpace(height) { if (!page || cursorY - height < margin) newPage(); }
    newPage();
    blocks.forEach(function (block) {
      var size = Math.max(9, Math.min(24, fontSizeFor(block.style))), lineHeight = Math.max(14, size * 1.35), gap = block.style ? 8 : 4;
      var lines = wrapText(block.text, font, size, contentWidth);
      if (!lines.length) { ensureSpace(lineHeight); cursorY -= lineHeight; return; }
      lines.forEach(function (line) { ensureSpace(lineHeight); if (line) page.drawText(line, { x: margin, y: cursorY, size: size, font: font }); cursorY -= lineHeight; });
      cursorY -= gap;
    });
    doc.setTitle(file.name.replace(/\.(docx?|docm|dotx?|dotm|odt|rtf|txt|html?)$/i, ""));
    doc.setCreator("FreePDF Tools");
    doc.setProducer("FreePDF Tools using pdf-lib");
    return doc.save({ useObjectStreams: true }).then(function (bytes) { return { bytes: bytes, pages: pages }; });
  }

  function update() {
    el.summary.textContent = file ? file.name + " · " + U.formatBytes(file.size) : "No document selected";
    el.convert.disabled = busy || !blocks.length;
    el.clear.disabled = busy || !file;
    el.input.disabled = busy;
    el.pageSize.disabled = busy;
    el.fontSize.disabled = busy;
    el.filename.disabled = busy;
  }

  async function load(collection) {
    if (busy) return;
    var next = Array.from(collection || [])[0];
    if (!next) return;
    if (!isSupported(next)) return U.setStatus(el.status, "Choose DOC, DOCX, DOCM, DOT, DOTX, DOTM, ODT, RTF, TXT or HTML.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the document below 40 MB for browser stability.", "error");
    busy = true; update(); U.setProgress(el.progress, 5);
    U.setStatus(el.status, "Reading the document locally…", "info");
    try {
      blocks = await parseDocument(next);
      if (!blocks.length) throw new Error("No readable text found");
      file = next;
      el.filename.value = U.safeBaseName(next.name);
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, blocks.length + " document blocks loaded. Choose PDF options and convert.", "success");
    } catch (error) {
      console.error(error); blocks = []; file = null; U.setProgress(el.progress, 0);
      U.setStatus(el.status, "Could not read this document. It may be damaged, encrypted or use unsupported features.", "error");
    } finally { busy = false; update(); }
  }

  async function convert() {
    if (busy || !blocks.length || !file) return;
    busy = true; update(); U.setProgress(el.progress, 3); U.setStatus(el.status, "Rendering the document to PDF locally…", "info");
    try {
      var result = await createPdf();
      var name = U.safeBaseName(el.filename.value || file.name) + ".pdf";
      U.downloadBlob(new Blob([result.bytes], { type: "application/pdf" }), name);
      U.setProgress(el.progress, 100); U.setStatus(el.status, "PDF created: " + name + " (" + result.pages + " pages). Download started.", "success");
    } catch (error) {
      console.error(error); U.setProgress(el.progress, 0); U.setStatus(el.status, "Could not create the PDF. Try a simpler or smaller document.", "error");
    } finally { busy = false; update(); }
  }

  function clear() {
    if (busy) return;
    blocks = []; file = null; el.filename.value = "converted-document"; U.setProgress(el.progress, 0);
    U.setStatus(el.status, "Choose a DOC, DOCX, ODT, RTF, TXT or HTML document.", "info"); update();
  }

  U.bindDropZone(el.zone, el.input, load);
  el.convert.addEventListener("click", convert);
  el.clear.addEventListener("click", clear);
  clear();
}());