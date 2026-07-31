(() => {
  "use strict";

  const MAX_SINGLE_FILE_BYTES = 60 * 1024 * 1024;

  const elements = {
    dropZone: document.getElementById("splitDropZone"),
    fileInput: document.getElementById("splitPdfFile"),
    fileName: document.getElementById("splitFileName"),
    pageCountLabel: document.getElementById("pageCount"),
    fromInput: document.getElementById("fromPage"),
    toInput: document.getElementById("toPage"),
    extractButton: document.getElementById("extractButton"),
    splitButton: document.getElementById("splitButton"),
    progressBar: document.getElementById("splitProgressBar"),
    status: document.getElementById("splitToolStatus")
  };

  let loadedDocument = null;
  let loadedFile = null;
  let processing = false;

  function setStatus(message, type = "info") {
    elements.status.textContent = message;
    elements.status.dataset.type = type;
  }

  function setProgress(pct) {
    const n = Math.max(0, Math.min(100, Number(pct) || 0));
    elements.progressBar.style.width = `${n}%`;
  }

  function setProcessing(v) {
    processing = Boolean(v);
    elements.fileInput.disabled = processing;
    elements.extractButton.disabled = processing || !loadedDocument;
    elements.splitButton.disabled = processing || !loadedDocument;
  }

  async function onFileSelected(file) {
    if (!file) return;

    if (!window.FreePDFTools.isPdfFile(file)) {
      setStatus(`\"${file.name}\" is not a supported PDF file.`, "error");
      return;
    }

    if (file.size > MAX_SINGLE_FILE_BYTES) {
      setStatus(`\"${file.name}\" is larger than 60 MB.`, "error");
      return;
    }

    setStatus("Reading PDF…", "info");
    setProgress(5);

    try {
      const bytes = await file.arrayBuffer();

      if (!window.PDFLib || !window.PDFLib.PDFDocument) {
        setStatus("The PDF library did not load. Refresh and try again.", "error");
        return;
      }

      const { PDFDocument } = window.PDFLib;
      const doc = await PDFDocument.load(bytes, { updateMetadata: false });

      const pageCount = doc.getPageCount();

      loadedDocument = doc;
      loadedFile = file;

      elements.fileName.textContent = file.name;
      elements.pageCountLabel.textContent = String(pageCount);

      elements.fromInput.value = "1";
      elements.toInput.value = String(pageCount);

      setStatus(`${pageCount} pages loaded. Choose a page range or split into single pages.`, "success");
      setProgress(100);
    } catch (err) {
      console.error("Failed to read PDF:", err);
      setStatus("Could not open the PDF. It may be encrypted or invalid.", "error");
      loadedDocument = null;
      loadedFile = null;
      elements.fileName.textContent = "";
      elements.pageCountLabel.textContent = "0";
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }

  elements.fileInput.addEventListener("change", () => {
    onFileSelected(elements.fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach((ev) => {
    elements.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((ev) => {
    elements.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.dropZone.classList.remove("is-dragging");
    });
  });

  elements.dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    onFileSelected(file);
  });

  async function extractRange() {
    if (processing || !loadedDocument || !loadedFile) return;

    const from = Math.max(1, Number(elements.fromInput.value) || 1);
    const to = Math.min(Number(elements.toInput.value) || 1, loadedDocument.getPageCount());

    if (from > to || from < 1) {
      setStatus("Invalid page range.", "error");
      return;
    }

    setProcessing(true);
    setProgress(3);
    setStatus(`Extracting pages ${from}–${to}…`, "info");

    try {
      const { PDFDocument } = window.PDFLib;
      const output = await PDFDocument.create();

      const pageIndexes = Array.from({ length: (to - from + 1) }, (_, i) => from - 1 + i);
      const copied = await output.copyPages(loadedDocument, pageIndexes);
      copied.forEach((p) => output.addPage(p));

      const outBytes = await output.save({ useObjectStreams: true });
      const blob = new Blob([outBytes], { type: "application/pdf" });

      const base = window.FreePDFTools.getSafeBaseName(loadedFile.name);
      const filename = `${base}-pages-${from}-to-${to}.pdf`;

      window.FreePDFTools.downloadBlob(blob, filename);

      setProgress(100);
      setStatus(`Pages ${from}–${to} extracted and downloaded.`, "success");
    } catch (err) {
      console.error("Extraction failed:", err);
      setStatus("Could not extract pages. Try a different range or file.", "error");
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }

  async function splitToZip() {
    if (processing || !loadedDocument || !loadedFile) return;

    if (!window.JSZip) {
      setStatus("Zip library failed to load. Refresh and try again.", "error");
      return;
    }

    setProcessing(true);
    setProgress(2);
    setStatus("Splitting into single-page PDFs…", "info");

    try {
      const { PDFDocument } = window.PDFLib;
      const JSZip = window.JSZip;
      const zip = new JSZip();

      const total = loadedDocument.getPageCount();

      for (let i = 0; i < total; i += 1) {
        const out = await PDFDocument.create();
        const [copied] = await out.copyPages(loadedDocument, [i]);
        out.addPage(copied);

        const bytes = await out.save({ useObjectStreams: true });
        const filename = `${window.FreePDFTools.getSafeBaseName(loadedFile.name)}-page-${String(i + 1).padStart(3, "0")}.pdf`;

        zip.file(filename, bytes);

        const pct = Math.round(((i + 1) / total) * 92);
        setProgress(pct);
      }

      setStatus("Creating ZIP archive…", "info");
      setProgress(95);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipName = `${window.FreePDFTools.getSafeBaseName(loadedFile.name)}-pages.zip`;

      window.FreePDFTools.downloadBlob(zipBlob, zipName);

      setProgress(100);
      setStatus(`All ${loadedDocument.getPageCount()} pages split and downloaded as ${zipName}.`, "success");
    } catch (err) {
      console.error("Split failed:", err);
      setStatus("Could not split the PDF. Try a smaller file.", "error");
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }

  elements.extractButton.addEventListener("click", extractRange);
  elements.splitButton.addEventListener("click", splitToZip);

  // initialize
  setProcessing(false);
  setProgress(0);
  setStatus("Choose a PDF to split or extract pages.", "info");
})();
