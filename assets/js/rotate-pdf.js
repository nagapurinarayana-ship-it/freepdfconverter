(() => {
  "use strict";

  const MAX_SINGLE_FILE_BYTES = 60 * 1024 * 1024;

  const elements = {
    dropZone: document.getElementById("rotateDropZone"),
    fileInput: document.getElementById("rotatePdfFile"),
    fileName: document.getElementById("rotateFileName"),
    pageCountLabel: document.getElementById("rotatePageCount"),
    fromInput: document.getElementById("rotateFromPage"),
    toInput: document.getElementById("rotateToPage"),
    angleSelect: document.getElementById("rotateAngle"),
    applyAllCheckbox: document.getElementById("rotateAllPages"),
    rotateButton: document.getElementById("rotateButton"),
    progressBar: document.getElementById("rotateProgressBar"),
    status: document.getElementById("rotateToolStatus")
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
    elements.rotateButton.disabled = processing || !loadedDocument;
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

      setStatus(`${pageCount} pages loaded. Choose rotation options.`, "success");
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

  async function rotatePdf() {
    if (processing || !loadedDocument || !loadedFile) return;

    const totalPages = loadedDocument.getPageCount();
    const from = Math.max(1, Number(elements.fromInput.value) || 1);
    const to = Math.min(Number(elements.toInput.value) || 1, totalPages);

    if (from > to || from < 1) {
      setStatus("Invalid page range.", "error");
      return;
    }

    const angleValue = Number(elements.angleSelect.value) || 0;
    const applyAll = elements.applyAllCheckbox.checked;

    setProcessing(true);
    setProgress(3);
    setStatus("Applying rotation…", "info");

    try {
      const { PDFDocument, degrees } = window.PDFLib;

      // We modify the loadedDocument in-place by setting rotations on pages and then save a copy
      const outDoc = await PDFDocument.create();

      // copy all pages first
      const pageIndices = loadedDocument.getPageIndices();
      const copiedPages = await outDoc.copyPages(loadedDocument, pageIndices);
      copiedPages.forEach((p) => outDoc.addPage(p));

      // Apply rotation to specified pages (indices are zero-based)
      for (let i = 0; i < pageIndices.length; i += 1) {
        const pageNumber = i + 1;
        if (applyAll || (pageNumber >= from && pageNumber <= to)) {
          const page = outDoc.getPage(i);
          const current = page.getRotation?.() || { angle: 0 };
          const newAngle = (current.angle + angleValue + 360) % 360;
          page.setRotation?.(degrees(newAngle));
        }

        const pct = Math.round(((i + 1) / pageIndices.length) * 92);
        setProgress(pct);
      }

      setStatus("Saving rotated PDF…", "info");
      const outBytes = await outDoc.save({ useObjectStreams: true });

      setProgress(98);
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const base = window.FreePDFTools.getSafeBaseName(loadedFile.name);
      const filename = `${base}-rotated.pdf`;

      window.FreePDFTools.downloadBlob(blob, filename);

      setProgress(100);
      setStatus("Rotation complete. Download started.", "success");
    } catch (err) {
      console.error("Rotation failed:", err);
      setStatus("Could not rotate the PDF. Try a different file.", "error");
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }

  elements.rotateButton.addEventListener("click", rotatePdf);

  // initialize
  setProcessing(false);
  setProgress(0);
  setStatus("Choose a PDF to rotate.", "info");
})();
