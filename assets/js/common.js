(() => {
  "use strict";

  const BYTES_IN_KILOBYTE = 1024;
  const BYTES_IN_MEGABYTE = BYTES_IN_KILOBYTE * 1024;
  const BYTES_IN_GIGABYTE = BYTES_IN_MEGABYTE * 1024;

  /**
   * Convert a byte value into a readable file-size label.
   *
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    const value = Number(bytes);

    if (!Number.isFinite(value) || value <= 0) {
      return "0 B";
    }

    if (value < BYTES_IN_KILOBYTE) {
      return `${value} B`;
    }

    if (value < BYTES_IN_MEGABYTE) {
      return `${(value / BYTES_IN_KILOBYTE).toFixed(1)} KB`;
    }

    if (value < BYTES_IN_GIGABYTE) {
      return `${(value / BYTES_IN_MEGABYTE).toFixed(1)} MB`;
    }

    return `${(value / BYTES_IN_GIGABYTE).toFixed(2)} GB`;
  }

  /**
   * Create a unique ID for a selected file entry.
   *
   * @returns {string}
   */
  function createId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return [
      Date.now(),
      Math.random().toString(16).slice(2)
    ].join("-");
  }

  /**
   * Create a safe filename without the current extension.
   *
   * @param {string} filename
   * @returns {string}
   */
  function getSafeBaseName(filename) {
    const withoutExtension = String(filename || "document")
      .replace(/\.[^.]+$/, "");

    const cleaned = withoutExtension
      .replace(/[^\p{L}\p{N}._-]+/gu, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    return cleaned || "document";
  }

  /**
   * Trigger a browser download for a Blob.
   *
   * @param {Blob} blob
   * @param {string} filename
   */
  function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = objectUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 30000);
  }

  /**
   * Check whether a selected file appears to be a PDF.
   *
   * Some browsers do not always return a MIME type, so the
   * extension is also checked.
   *
   * @param {File} file
   * @returns {boolean}
   */
  function isPdfFile(file) {
    if (!(file instanceof File)) {
      return false;
    }

    const typeIsPdf =
      file.type === "application/pdf";

    const extensionIsPdf =
      file.name.toLowerCase().endsWith(".pdf");

    return typeIsPdf || extensionIsPdf;
  }

  /**
   * Return the total size of an array of File objects.
   *
   * @param {File[]} files
   * @returns {number}
   */
  function getTotalSize(files) {
    return files.reduce((total, file) => {
      return total + Number(file.size || 0);
    }, 0);
  }

  window.FreePDFTools = Object.freeze({
    formatBytes,
    createId,
    getSafeBaseName,
    downloadBlob,
    isPdfFile,
    getTotalSize
  });
})();
