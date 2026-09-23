(function () {
  "use strict";

  var U = window.FreePDF;
  var MAX_FILE = 40 * U.MB;
  var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  var blocks = [];
  var file = null;
  var busy = false;
  var sourceKind = "";
  var msDocParserPromise = null;

  var SUPPORTED_EXTENSIONS = [
    ".doc", ".docx", ".docm", ".dot", ".dotx", ".dotm",
    ".odt", ".rtf", ".txt", ".html", ".htm"
  ];

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

  async function getMsDocParser() {
    if (!msDocParserPromise) {
      msDocParserPromise = import("/assets/vendor/docjs/index.js").catch(function () {
        // Deployment-safe fallback for environments that have not run the asset build yet.
        return import("https://cdn.jsdelivr.net/npm/@file-viewer/doc@2.2.7/dist/index.js");
      }).then(function (module) {
        if (!module || typeof module.parseMsDoc !== "function") throw new Error("MS-DOC parser is unavailable.");
        return module.parseMsDoc;
      }).catch(function (error) {
        msDocParserPromise = null;
        throw new Error("Microsoft Word 97-2003 support could not be loaded. Please refresh and try again. " + (error && error.message ? error.message : ""));
      });
    }
    return msDocParserPromise;
  }

  function extension(name) {
    var match = /\.[^.]+$/.exec(String(name || "").toLowerCase());
    return match ? match[0] : "";
  }

  function supportedFile(next) {
    return next instanceof File && SUPPORTED_EXTENSIONS.includes(extension(next.name));
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
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
    var props = Array.from(p.children || []).find(function (child) { return child.localName === "pPr"; });
    if (!props) return "";
    var style = Array.from(props.children || []).find(function (child) { return child.localName === "pStyle"; });
    return attr(style, "val");
  }

  function blocksFromDocxXml(xml) {
    var parsed = new DOMParser().parseFromString(xml, "application/xml");
    if (parsed.getElementsByTagName("parsererror").length) throw new Error("Invalid Word XML");
    var body = parsed.getElementsByTagNameNS(W, "body")[0] || parsed.documentElement;
    var result = [];

    Array.from(body.children || []).forEach(function (child) {
      if (child.localName === "p") {
        var text = cleanText(nodeText(child));
        var style = paragraphStyle(child).toLowerCase();
        if (text || style) result.push({ text: text, style: style });
      } else if (child.localName === "tbl") {
        Array.from(child.getElementsByTagNameNS(W, "tr")).forEach(function (row) {
          var cells = Array.from(row.children || []).filter(function (node) { return node.localName === "tc"; }).map(function (cell) {
            return cleanText(nodeText(cell));
          });
          if (cells.some(Boolean)) result.push({ text: cells.join("  |  "), style: "table" });
        });
      }
    });

    if (!result.length) throw new Error("No readable Word text found");
    return result;
  }

  async function parseOoxml(next) {
    var zip = await window.JSZip.loadAsync(await next.arrayBuffer());
    var entry = zip.file("word/document.xml");
    if (!entry) throw new Error("This Word package does not contain word/document.xml");
    return blocksFromDocxXml(await entry.async("text"));
  }

  async function parseOdt(next) {
    var zip = await window.JSZip.loadAsync(await next.arrayBuffer());
    var entry = zip.file("content.xml");
    if (!entry) throw new Error("ODT content.xml not found");
    var parsed = new DOMParser().parseFromString(await entry.async("text"), "application/xml");
    if (parsed.getElementsByTagName("parsererror").length) throw new Error("Invalid ODT XML");
    var result = [];
    Array.from(parsed.getElementsByTagName("*")).forEach(function (node) {
      if (!/^p$|^h$/.test(node.localName || "")) return;
      var text = cleanText(node.textContent || "");
      if (!text) return;
      result.push({ text: text, style: node.localName === "h" ? "heading" + (node.getAttribute("text:outline-level") || "1") : "" });
    });
    if (!result.length) throw new Error("No readable ODT text found");
    return result;
  }

  function parseRtf(value) {
    var text = String(value || "").replace(/\r\n/g, "\n");
    text = text.replace(/\\'([0-9a-f]{2})/gi, function (_, hex) { return String.fromCharCode(parseInt(hex, 16)); });
    text = text.replace(/\\([a-z]+)(-?\d+)? ?/gi, function (_, word) {
      if (word === "par" || word === "line") return "\n";
      if (word === "tab") return "\t";
      if (word === "emdash") return "—";
      if (word === "endash") return "–";
      if (word === "bullet") return "•";
      return "";
    });
    text = text.replace(/\\[^a-z{}\\][ ]?/gi, "").replace(/[{}]/g, "").replace(/\n{3,}/g, "\n\n");
    return text.split(/\n/).map(function (line) { return { text: cleanText(line), style: "" }; }).filter(function (block) { return block.text; });
  }

  function parseHtml(value) {
    var parsed = new DOMParser().parseFromString(String(value || ""), "text/html");
    var result = [];
    Array.from(parsed.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,div")).forEach(function (node) {
      var text = cleanText(node.innerText || node.textContent || "");
      if (!text) return;
      var tag = node.tagName.toLowerCase();
      result.push({ text: text, style: /^h[1-6]$/.test(tag) ? "heading" + tag.slice(1) : "" });
    });
    if (!result.length) throw new Error("No readable HTML text found");
    return result;
  }

  function parseTxt(value) {
    return String(value || "").replace(/\r\n?/g, "\n").split("\n").map(function (line) { return { text: line.trim(), style: "" }; }).filter(function (block) { return block.text; });
  }

  function flattenMsDoc(parsed) {
    var result = [];
    (parsed.blocks || []).forEach(function (block) {
      if (block.type === "paragraph") {
        if (block.text && block.text.trim()) result.push({ text: block.text.trim(), style: (block.styleName || "").toLowerCase() });
      } else if (block.type === "table") {
        (block.rows || []).forEach(function (row) {
          var cells = (row.cells || []).map(function (cell) {
            return (cell.paragraphs || []).map(function (paragraph) { return String(paragraph.text || "").trim(); }).filter(Boolean).join(" ");
          }).filter(Boolean);
          if (cells.length) result.push({ text: cells.join("  |  "), style: "table" });
        });
      }
    });
    if (!result.length) throw new Error("No readable text found in the Word 97-2003 document");
    return result;
  }

  async function parseDocument(next) {
    var ext = extension(next.name);
    sourceKind = ext;

    if (ext === ".doc" || ext === ".dot") {
      var parseMsDoc = await getMsDocParser();
      var parsed = parseMsDoc(await next.arrayBuffer(), { maxPictureBytes: 8 * 1024 * 1024 });
      if (parsed.meta && parsed.meta.fib && parsed.meta.fib.fEncrypted) throw new Error("Encrypted Microsoft Word 97-2003 documents are not supported.");
      return flattenMsDoc(parsed);
    }

    if (ext === ".docx" || ext === ".docm" || ext === ".dotx" || ext === ".dotm") return parseOoxml(next);
    if (ext === ".odt") return parseOdt(next);

    var value = await next.text();
    if (ext === ".rtf") return parseRtf(value);
    if (ext === ".html" || ext === ".htm") return parseHtml(value);
    return parseTxt(value);
  }

  function fontSizeFor(style) {
    if (/heading1|heading-1|title/.test(style)) return 20;
    if (/heading2|heading-2/.test(style)) return 16;
    if (/heading3|heading-3/.test(style)) return 14;
    return Number(el.fontSize.value) || 12;
  }

  function pageSpec() {
    return el.pageSize.value === "Letter" ? { width: 612, height: 792 } : { width: 595.28, height: 841.89 };
  }

  function wrapText(text, font, size, maxWidth) {
    var lines = [];
    String(text || "").split("\n").forEach(function (logicalLine) {
      if (!logicalLine) { lines.push(""); return; }
      var words = logicalLine.split(/\s+/);
      var current = "";
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
    var page = null, pages = 0, cursorY = 0;

    function newPage() { page = doc.addPage([spec.width, spec.height]); cursorY = spec.height - margin; pages += 1; }
    function ensureSpace(height) { if (!page || cursorY - height < margin) newPage(); }

    newPage();
    blocks.forEach(function (block) {
      var size = Math.max(9, Math.min(24, fontSizeFor(block.style)));
      var lineHeight = Math.max(14, size * 1.35);
      var gap = /heading|title/.test(block.style) ? 8 : 4;
      wrapText(block.text, font, size, contentWidth).forEach(function (line) {
        ensureSpace(lineHeight);
        if (line) page.drawText(line, { x: margin, y: cursorY, size: size, font: font });
        cursorY -= lineHeight;
      });
      cursorY -= gap;
    });

    doc.setTitle(file.name.replace(/\.[^.]+$/i, ""));
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
    if (!supportedFile(next)) return U.setStatus(el.status, "Choose DOC, DOCX, DOCM, DOT, DOTX, DOTM, ODT, RTF, TXT or HTML.", "error");
    if (next.size > MAX_FILE) return U.setStatus(el.status, "Keep the document below 40 MB for browser stability.", "error");

    busy = true; update(); U.setProgress(el.progress, 4); U.setStatus(el.status, "Reading the document locally…", "info");
    try {
      blocks = await parseDocument(next);
      file = next;
      el.filename.value = U.safeBaseName(next.name);
      U.setProgress(el.progress, 100);
      U.setStatus(el.status, (sourceKind === ".doc" ? "Microsoft Word 97-2003 document" : sourceKind.toUpperCase() + " document") + " loaded. Ready to convert locally.", "success");
    } catch (error) {
      console.error(error); blocks = []; file = null; U.setProgress(el.progress, 0);
      U.setStatus(el.status, error && error.message ? error.message : "Could not read this document.", "error");
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
    blocks = []; file = null; sourceKind = ""; el.filename.value = "converted-document";
    U.setProgress(el.progress, 0); U.setStatus(el.status, "Choose a Word or document file.", "info"); update();
  }

  U.bindDropZone(el.zone, el.input, load);
  el.convert.addEventListener("click", convert);
  el.clear.addEventListener("click", clear);
  clear();
}());
