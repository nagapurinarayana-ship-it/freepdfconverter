(() => {
  "use strict";

  const MAX_SINGLE_FILE_BYTES =
    60 * 1024 * 1024;

  const MAX_TOTAL_FILE_BYTES =
    120 * 1024 * 1024;

  const elements = {
    dropZone:
      document.getElementById("dropZone"),

    fileInput:
      document.getElementById("pdfFiles"),

    fileList:
      document.getElementById("fileList"),

    fileCount:
      document.getElementById("fileCount"),

    mergeButton:
      document.getElementById("mergeButton"),

    clearButton:
      document.getElementById("clearButton"),

    progressBar:
      document.getElementById("progressBar"),

    status:
      document.getElementById("toolStatus")
  };

  let selectedFiles = [];
  let processing = false;

  /**
   * Display a tool message.
   *
   * @param {string} message
   * @param {"info"|"success"|"error"} type
   */
  function setStatus(message, type = "info") {
    elements.status.textContent = message;
    elements.status.dataset.type = type;
  }

  /**
   * Update the progress bar.
   *
   * @param {number} percentage
   */
  function setProgress(percentage) {
    const normalized = Math.max(
      0,
      Math.min(100, Number(percentage) || 0)
    );

    elements.progressBar.style.width =
      `${normalized}%`;
  }

  /**
   * Enable or disable controls during processing.
   *
   * @param {boolean} value
   */
  function setProcessing(value) {
    processing = Boolean(value);

    elements.fileInput.disabled = processing;
    elements.clearButton.disabled = processing;

    updateButtonState();
    renderFileList();
  }

  /**
   * Enable Merge only when two or more files exist.
   */
  function updateButtonState() {
    elements.mergeButton.disabled =
      processing || selectedFiles.length < 2;

    elements.fileCount.textContent =
      `${selectedFiles.length} ${
        selectedFiles.length === 1
          ? "file"
          : "files"
      } selected`;
  }

  /**
   * Return all selected File objects.
   *
   * @returns {File[]}
   */
  function getFiles() {
    return selectedFiles.map((entry) => {
      return entry.file;
    });
  }

  /**
   * Add selected files after validation.
   *
   * @param {FileList|File[]} fileCollection
   */
  function addFiles(fileCollection) {
    const incomingFiles =
      Array.from(fileCollection || []);

    if (!incomingFiles.length) {
      return;
    }

    const invalidFile = incomingFiles.find((file) => {
      return !window.FreePDFTools.isPdfFile(file);
    });

    if (invalidFile) {
      setStatus(
        `"${invalidFile.name}" is not a supported PDF file.`,
        "error"
      );

      elements.fileInput.value = "";
      return;
    }

    const oversizedFile =
      incomingFiles.find((file) => {
        return file.size > MAX_SINGLE_FILE_BYTES;
      });

    if (oversizedFile) {
      setStatus(
        `"${oversizedFile.name}" is larger than 60 MB.`,
        "error"
      );

      elements.fileInput.value = "";
      return;
    }

    const combinedFiles = [
      ...getFiles(),
      ...incomingFiles
    ];

    const totalSize =
      window.FreePDFTools.getTotalSize(
        combinedFiles
      );

    if (totalSize > MAX_TOTAL_FILE_BYTES) {
      setStatus(
        [
          "The selected files total",
          window.FreePDFTools.formatBytes(totalSize),
          "Keep the total below 120 MB for browser stability."
        ].join(" "),
        "error"
      );

      elements.fileInput.value = "";
      return;
    }

    incomingFiles.forEach((file) => {
      selectedFiles.push({
        id: window.FreePDFTools.createId(),
        file
      });
    });

    elements.fileInput.value = "";

    renderFileList();
    updateButtonState();
    setProgress(0);

    if (selectedFiles.length < 2) {
      setStatus(
        "Select at least one more PDF.",
        "info"
      );
    } else {
      setStatus(
        [
          `${selectedFiles.length} PDFs are ready.`,
          "Use the arrow buttons to change their order."
        ].join(" "),
        "success"
      );
    }
  }

  /**
   * Create the selected-file list safely.
   *
   * File names are assigned with textContent and are never
   * inserted as HTML.
   */
  function renderFileList() {
    elements.fileList.innerHTML = "";

    selectedFiles.forEach((entry, index) => {
      const listItem =
        document.createElement("li");

      listItem.className = "file-row";
      listItem.dataset.fileId = entry.id;

      const position =
        document.createElement("span");

      position.className = "file-position";
      position.textContent = String(index + 1);
      position.setAttribute(
        "aria-label",
        `Position ${index + 1}`
      );

      const information =
        document.createElement("div");

      information.className =
        "file-information";

      const name =
        document.createElement("span");

      name.className = "file-name";
      name.textContent = entry.file.name;
      name.title = entry.file.name;

      const size =
        document.createElement("span");

      size.className = "file-size";
      size.textContent =
        window.FreePDFTools.formatBytes(
          entry.file.size
        );

      information.append(name, size);

      const controls =
        document.createElement("div");

      controls.className = "file-controls";

      const moveUpButton =
        createFileControlButton({
          symbol: "↑",
          label: `Move ${entry.file.name} up`,
          action: "move-up",
          disabled: processing || index === 0
        });

      const moveDownButton =
        createFileControlButton({
          symbol: "↓",
          label: `Move ${entry.file.name} down`,
          action: "move-down",
          disabled:
            processing ||
            index === selectedFiles.length - 1
        });

      const removeButton =
        createFileControlButton({
          symbol: "×",
          label: `Remove ${entry.file.name}`,
          action: "remove",
          disabled: processing,
          extraClass: "remove"
        });

      controls.append(
        moveUpButton,
        moveDownButton,
        removeButton
      );

      listItem.append(
        position,
        information,
        controls
      );

      elements.fileList.appendChild(listItem);
    });
  }

  /**
   * Build a file-list control button.
   *
   * @param {object} options
   * @returns {HTMLButtonElement}
   */
  function createFileControlButton(options) {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      `file-control-button ${
        options.extraClass || ""
      }`.trim();

    button.textContent = options.symbol;
    button.dataset.action = options.action;
    button.setAttribute(
      "aria-label",
      options.label
    );

    button.disabled =
      Boolean(options.disabled);

    return button;
  }

  /**
   * Move an item within the selectedFiles array.
   *
   * @param {number} currentIndex
   * @param {number} newIndex
   */
  function moveFile(currentIndex, newIndex) {
    if (
      currentIndex < 0 ||
      newIndex < 0 ||
      currentIndex >= selectedFiles.length ||
      newIndex >= selectedFiles.length
    ) {
      return;
    }

    const [entry] =
      selectedFiles.splice(currentIndex, 1);

    selectedFiles.splice(newIndex, 0, entry);

    renderFileList();
    updateButtonState();

    setStatus(
      "File order updated.",
      "success"
    );
  }

  /**
   * Remove every selected file.
   */
  function clearFiles() {
    if (processing) {
      return;
    }

    selectedFiles = [];
    elements.fileInput.value = "";

    renderFileList();
    updateButtonState();
    setProgress(0);

    setStatus(
      "Choose at least two PDF files.",
      "info"
    );
  }

  /**
   * Merge every selected PDF in its displayed order.
   */
  async function mergePdfs() {
    if (
      processing ||
      selectedFiles.length < 2
    ) {
      return;
    }

    if (
      !window.PDFLib ||
      !window.PDFLib.PDFDocument
    ) {
      setStatus(
        "The PDF library did not load. Check your internet connection and refresh the page.",
        "error"
      );

      return;
    }

    setProcessing(true);
    setProgress(2);

    try {
      const {
        PDFDocument
      } = window.PDFLib;

      const mergedDocument =
        await PDFDocument.create();

      let mergedPageCount = 0;

      for (
        let index = 0;
        index < selectedFiles.length;
        index += 1
      ) {
        const entry = selectedFiles[index];

        setStatus(
          `Reading ${index + 1} of ${
            selectedFiles.length
          }: ${entry.file.name}`,
          "info"
        );

        const sourceBytes =
          await entry.file.arrayBuffer();

        const sourceDocument =
          await PDFDocument.load(
            sourceBytes,
            {
              updateMetadata: false
            }
          );

        const pageIndexes =
          sourceDocument.getPageIndices();

        if (!pageIndexes.length) {
          throw new Error(
            `"${entry.file.name}" contains no pages.`
          );
        }

        const copiedPages =
          await mergedDocument.copyPages(
            sourceDocument,
            pageIndexes
          );

        copiedPages.forEach((page) => {
          mergedDocument.addPage(page);
        });

        mergedPageCount += copiedPages.length;

        const readingProgress =
          ((index + 1) /
            selectedFiles.length) *
          82;

        setProgress(readingProgress);
      }

      setStatus(
        "Creating the final PDF…",
        "info"
      );

      mergedDocument.setTitle("Merged PDF");
      mergedDocument.setAuthor(
        "FreePDF Tools"
      );
      mergedDocument.setCreator(
        "FreePDF Tools"
      );
      mergedDocument.setProducer(
        "FreePDF Tools using pdf-lib"
      );
      mergedDocument.setCreationDate(
        new Date()
      );
      mergedDocument.setModificationDate(
        new Date()
      );

      const outputBytes =
        await mergedDocument.save({
          useObjectStreams: true
        });

      setProgress(95);

      const outputBlob =
        new Blob(
          [outputBytes],
          {
            type: "application/pdf"
          }
        );

      window.FreePDFTools.downloadBlob(
        outputBlob,
        "merged.pdf"
      );

      setProgress(100);

      setStatus(
        [
          "Success:",
          `${selectedFiles.length} PDFs`,
          `and ${mergedPageCount} pages`,
          "were merged. The download has started."
        ].join(" "),
        "success"
      );
    } catch (error) {
      console.error(
        "PDF merge failed:",
        error
      );

      const errorMessage =
        String(error?.message || "");

      const appearsEncrypted =
        errorMessage
          .toLowerCase()
          .includes("encrypt");

      if (appearsEncrypted) {
        setStatus(
          "A password-protected or encrypted PDF could not be opened. Remove its password first and try again.",
          "error"
        );
      } else {
        setStatus(
          errorMessage ||
            "The PDFs could not be merged. Try smaller, valid PDF files.",
          "error"
        );
      }

      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }

  /**
   * Handle Up, Down and Remove button clicks.
   */
  elements.fileList.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-action]"
        );

      if (!button || processing) {
        return;
      }

      const row =
        button.closest("[data-file-id]");

      if (!row) {
        return;
      }

      const currentIndex =
        selectedFiles.findIndex((entry) => {
          return entry.id === row.dataset.fileId;
        });

      if (currentIndex < 0) {
        return;
      }

      const action =
        button.dataset.action;

      if (action === "move-up") {
        moveFile(
          currentIndex,
          currentIndex - 1
        );
      }

      if (action === "move-down") {
        moveFile(
          currentIndex,
          currentIndex + 1
        );
      }

      if (action === "remove") {
        selectedFiles.splice(
          currentIndex,
          1
        );

        renderFileList();
        updateButtonState();
        setProgress(0);

        setStatus(
          selectedFiles.length >= 2
            ? "File removed. The remaining PDFs are ready."
            : "Select at least two PDFs.",
          selectedFiles.length >= 2
            ? "success"
            : "info"
        );
      }
    }
  );

  elements.fileInput.addEventListener(
    "change",
    () => {
      addFiles(elements.fileInput.files);
    }
  );

  [
    "dragenter",
    "dragover"
  ].forEach((eventName) => {
    elements.dropZone.addEventListener(
      eventName,
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!processing) {
          elements.dropZone.classList.add(
            "is-dragging"
          );
        }
      }
    );
  });

  [
    "dragleave",
    "drop"
  ].forEach((eventName) => {
    elements.dropZone.addEventListener(
      eventName,
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        elements.dropZone.classList.remove(
          "is-dragging"
        );
      }
    );
  });

  elements.dropZone.addEventListener(
    "drop",
    (event) => {
      if (processing) {
        return;
      }

      addFiles(
        event.dataTransfer.files
      );
    }
  );

  elements.mergeButton.addEventListener(
    "click",
    mergePdfs
  );

  elements.clearButton.addEventListener(
    "click",
    clearFiles
  );

  clearFiles();
})();
