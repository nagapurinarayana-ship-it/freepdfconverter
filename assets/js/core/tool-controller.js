/**
 * Shared browser tool lifecycle.
 *
 * This is the web equivalent of a Page Object / controller layer:
 * DOM wiring, file validation, busy state, progress and status are centralized.
 * Individual tools only implement their business-specific selection/process logic.
 *
 * Supports both single-file tools and multi-file batch tools.
 */
export class ToolController {
  constructor(options) {
    this.options = options;
    this.state = Object.assign({}, options.initialState || {});
    this.file = null;
    this.files = [];
    this.ready = false;
    this.busy = false;

    this.el = {};
    for (const [name, selector] of Object.entries(options.selectors || {})) {
      this.el[name] = document.querySelector(selector);
      if (!this.el[name]) throw new Error("Missing required tool element: " + selector);
    }
  }

  get multiple() {
    return this.options.multiple === true;
  }

  mount() {
    this.bindDropZone();
    this.el.action.addEventListener("click", () => this.run());
    this.el.clear.addEventListener("click", () => this.reset());
    this.reset();
  }

  bindDropZone() {
    const zone = this.el.zone;
    const input = this.el.input;

    ["dragenter", "dragover"].forEach((eventName) => {
      zone.addEventListener(eventName, (event) => {
        event.preventDefault();
        zone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      zone.addEventListener(eventName, (event) => {
        event.preventDefault();
        zone.classList.remove("is-dragging");
      });
    });

    zone.addEventListener("drop", (event) => this.select(event.dataTransfer.files));
    input.addEventListener("change", () => {
      this.select(input.files);
      input.value = "";
    });
  }

  async select(collection) {
    if (this.busy) return;

    const candidates = this.multiple
      ? Array.from(collection || [])
      : Array.from(collection || []).slice(0, 1);

    if (!candidates.length) return;

    const invalid = candidates
      .map((file) => ({ file, error: this.validateFile(file) }))
      .find((entry) => entry.error);

    if (invalid) {
      this.setStatus(invalid.error, "error");
      return;
    }

    if (this.multiple && this.options.maxFiles && candidates.length > this.options.maxFiles) {
      this.setStatus(
        this.options.maxFilesMessage || ("Choose no more than " + this.options.maxFiles + " files."),
        "error"
      );
      return;
    }

    if (this.multiple && this.options.maxTotalFileBytes) {
      const totalBytes = candidates.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > this.options.maxTotalFileBytes) {
        this.setStatus(
          this.options.maxTotalFileMessage || "The selected batch is too large for browser memory.",
          "error"
        );
        return;
      }
    }

    try {
      this.file = candidates[0] || null;
      this.files = candidates;
      this.ready = false;

      if (this.multiple) {
        await (this.options.onFilesSelected?.(this.context()) ?? this.options.onFileSelected?.(this.context()));
      } else {
        await this.options.onFileSelected?.(this.context());
      }

      this.ready = true;
      this.setStatus(
        this.options.readyMessage ||
          (this.multiple
            ? candidates.length + " file" + (candidates.length === 1 ? "" : "s") + " ready to process."
            : "Ready to process."),
        "success"
      );
    } catch (error) {
      this.file = null;
      this.files = [];
      this.ready = false;
      this.options.onReset?.(this.context());
      this.setStatus(
        this.options.readErrorMessage || "The selected file could not be read in your browser.",
        "error"
      );
    }

    this.updateAvailability();
    this.updateFileSummary();
  }

  validateFile(file) {
    if (!(file instanceof File)) return "Choose a supported file.";
    if (this.options.accept && !this.options.accept(file)) {
      return this.options.invalidTypeMessage || "Choose a supported file.";
    }
    if (this.options.maxFileBytes && file.size > this.options.maxFileBytes) {
      return this.options.maxFileMessage || "The selected file is too large.";
    }
    return "";
  }

  async run() {
    if (this.busy || !this.ready || (!this.multiple && !this.file) || (this.multiple && !this.files.length)) return;

    this.busy = true;
    this.updateAvailability();

    try {
      await this.options.onProcess(this.context());
    } catch (error) {
      this.setProgress(0);
      if (this.options.onError) {
        this.options.onError(error, this.context());
      } else {
        this.setStatus(
          this.options.processErrorMessage || "The file could not be processed in your browser.",
          "error"
        );
      }
    } finally {
      this.busy = false;
      this.updateAvailability();
    }
  }

  reset() {
    if (this.busy) return;
    this.file = null;
    this.files = [];
    this.ready = false;
    this.state = Object.assign({}, this.options.initialState || {});
    this.el.input.value = "";
    this.setProgress(0);
    this.options.onReset?.(this.context());
    this.setStatus(this.options.initialMessage || "Choose a file to begin.", "info");
    this.updateAvailability();
    this.updateFileSummary();
  }

  context() {
    return {
      file: this.file,
      files: this.files,
      state: this.state,
      el: this.el,
      busy: this.busy,
      multiple: this.multiple,
      setStatus: (message, type) => this.setStatus(message, type),
      setProgress: (value) => this.setProgress(value),
      formatBytes: window.FreePDF.formatBytes,
      safeBaseName: window.FreePDF.safeBaseName,
      downloadBlob: window.FreePDF.downloadBlob
    };
  }

  updateFileSummary() {
    if (this.el.summary) {
      if (this.multiple) {
        if (!this.files.length) {
          this.el.summary.textContent = this.options.emptySummary || "No files selected";
        } else {
          const totalBytes = this.files.reduce((sum, file) => sum + file.size, 0);
          this.el.summary.textContent =
            this.files.length + " file" + (this.files.length === 1 ? "" : "s") +
            " · " + window.FreePDF.formatBytes(totalBytes);
        }
      } else {
        this.el.summary.textContent = this.file
          ? this.file.name + " · " + window.FreePDF.formatBytes(this.file.size)
          : this.options.emptySummary || "No file selected";
      }
    }

    if (this.el.originalSize) {
      if (this.multiple) {
        const totalBytes = this.files.reduce((sum, file) => sum + file.size, 0);
        this.el.originalSize.textContent = this.files.length
          ? window.FreePDF.formatBytes(totalBytes)
          : "—";
      } else {
        this.el.originalSize.textContent = this.file
          ? window.FreePDF.formatBytes(this.file.size)
          : "—";
      }
    }
  }

  updateAvailability() {
    const hasSelection = this.multiple ? this.files.length > 0 : Boolean(this.file);
    if (this.el.action) this.el.action.disabled = this.busy || !hasSelection || !this.ready;
    if (this.el.clear) this.el.clear.disabled = this.busy || !hasSelection;
    if (this.el.input) this.el.input.disabled = this.busy;
  }

  setStatus(message, type = "info") {
    window.FreePDF.setStatus(this.el.status, message, type);
  }

  setProgress(value) {
    window.FreePDF.setProgress(this.el.progress, value);
  }
}
