/**
 * Shared browser tool lifecycle.
 *
 * This is the web equivalent of a Page Object / controller layer:
 * DOM wiring, file validation, busy state, progress and status are centralized.
 * Individual tools only implement their business-specific selection/process logic.
 */
export class ToolController {
  constructor(options) {
    this.options = options;
    this.state = Object.assign({}, options.initialState || {});
    this.file = null;
    this.ready = false;
    this.busy = false;

    this.el = {};
    for (const [name, selector] of Object.entries(options.selectors || {})) {
      this.el[name] = document.querySelector(selector);
      if (!this.el[name]) throw new Error("Missing required tool element: " + selector);
    }
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

    const next = Array.from(collection || [])[0];
    if (!next) return;

    const error = this.validateFile(next);
    if (error) {
      this.setStatus(error, "error");
      return;
    }

    try {
      this.file = next;
      this.ready = false;
      await (this.options.onFileSelected?.(this.context()));
      this.ready = true;
      this.setStatus(this.options.readyMessage || "Ready to process.", "success");
    } catch (error) {
      this.file = null;
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
    if (this.busy || !this.file || !this.ready) return;

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
      state: this.state,
      el: this.el,
      busy: this.busy,
      setStatus: (message, type) => this.setStatus(message, type),
      setProgress: (value) => this.setProgress(value),
      formatBytes: window.FreePDF.formatBytes,
      safeBaseName: window.FreePDF.safeBaseName,
      downloadBlob: window.FreePDF.downloadBlob
    };
  }

  updateFileSummary() {
    if (this.el.summary) {
      this.el.summary.textContent = this.file
        ? this.file.name + " · " + window.FreePDF.formatBytes(this.file.size)
        : this.options.emptySummary || "No file selected";
    }
    if (this.el.originalSize) {
      this.el.originalSize.textContent = this.file
        ? window.FreePDF.formatBytes(this.file.size)
        : "—";
    }
  }

  updateAvailability() {
    if (this.el.action) this.el.action.disabled = this.busy || !this.file || !this.ready;
    if (this.el.clear) this.el.clear.disabled = this.busy || !this.file;
    if (this.el.input) this.el.input.disabled = this.busy;
  }

  setStatus(message, type = "info") {
    window.FreePDF.setStatus(this.el.status, message, type);
  }

  setProgress(value) {
    window.FreePDF.setProgress(this.el.progress, value);
  }
}
