/**
 * Shared browser tool lifecycle.
 *
 * DOM wiring, file validation, busy state, progress and status are centralized.
 * Individual tools only implement business-specific selection/process logic.
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

    // Photo Compressor and Signature Resizer need an isolated Android picker
    // lifecycle. Do not route these two inputs through the shared recovery
    // implementation because Android Chrome can silently return from the native
    // media picker without dispatching change. We keep the workaround scoped to
    // these two new tools and leave every other ToolController tool untouched.
    if (input && (input.id === "imageFile" || input.id === "signatureFile")) {
      this.bindIsolatedAndroidPicker(zone, input);
      return;
    }

    if (typeof window.FreePDF?.bindDropZone === "function") {
      window.FreePDF.bindDropZone(
        zone,
        input,
        (files) => this.select(files)
      );
      return;
    }

    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.select(event.dataTransfer?.files || []);
    });
    input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      if (files.length) this.select(files);
    });
  }

  bindIsolatedAndroidPicker(zone, input) {
    ["dragenter", "dragover"].forEach((name) => {
      zone.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((name) => {
      zone.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.remove("is-dragging");
      });
    });

    zone.addEventListener("drop", (event) => {
      this.select(Array.from(event.dataTransfer?.files || []));
    });

    let handled = false;
    let timer = null;
    let startedAt = 0;

    const readFiles = () => Array.from(input.files || []);

    const stopPolling = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const consume = () => {
      if (handled) return true;
      const files = readFiles();
      if (!files.length) return false;
      handled = true;
      stopPolling();
      Promise.resolve(this.select(files)).catch(() => {});
      return true;
    };

    const poll = () => {
      timer = null;
      if (handled) return;
      if (consume()) return;
      if (Date.now() - startedAt < 10000) {
        timer = window.setTimeout(poll, 100);
      }
    };

    const startPolling = () => {
      stopPolling();
      if (handled) return;
      startedAt = Date.now();
      poll();
    };

    const openPicker = (event) => {
      event.preventDefault();
      event.stopPropagation();
      handled = false;
      stopPolling();
      try { input.value = ""; } catch (_) {}
      // Keep the native picker invocation directly inside the user gesture.
      // This avoids label activation differences seen on Android Chrome.
      input.click();
      startPolling();
    };

    const trigger = document.querySelector('label[for="' + input.id + '"]');
    if (trigger) trigger.addEventListener("click", openPicker);

    input.addEventListener("change", () => {
      consume();
    });

    window.addEventListener("focus", () => {
      if (!handled) startPolling();
    });

    window.addEventListener("pageshow", () => {
      if (!handled) startPolling();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !handled) startPolling();
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
      this.updateAvailability();
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
      console.error("FreePDF file selection failed:", error);
    }

    this.updateAvailability();
    this.updateFileSummary();
  }

  validateFile(file) {
    const isFileLike = file && typeof file.name === "string" && Number.isFinite(Number(file.size));
    if (!isFileLike) return "Choose a supported file.";
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
      setStatus: (message, type) => this.setStatus(message, type),
      setProgress: (value) => this.setProgress(value),
      formatBytes: window.FreePDF.formatBytes,
      safeBaseName: window.FreePDF.safeBaseName,
      downloadBlob: window.FreePDF.downloadBlob
    };
  }

  setStatus(message, type = "info") {
    window.FreePDF.setStatus(this.el.status, message, type);
  }

  setProgress(value) {
    window.FreePDF.setProgress(this.el.progress, value);
  }

  updateAvailability() {
    this.el.action.disabled = this.busy || !this.ready;
    this.el.clear.disabled = this.busy || (!this.file && !this.files.length);
  }

  updateFileSummary() {
    if (!this.el.summary) return;

    if (!this.multiple) {
      this.el.summary.textContent = this.file
        ? this.file.name + " · " + window.FreePDF.formatBytes(this.file.size)
        : this.options.emptySummary || "No file selected";
      return;
    }

    if (!this.files.length) {
      this.el.summary.textContent = this.options.emptySummary || "No files selected";
      return;
    }

    const totalBytes = this.files.reduce((sum, file) => sum + file.size, 0);
    const visibleNames = this.files.slice(0, 3).map((file) => file.name);
    const extraCount = this.files.length - visibleNames.length;
    const nameText = visibleNames.join(" · ") + (extraCount > 0 ? " · +" + extraCount + " more" : "");
    this.el.summary.textContent =
      nameText + " · " + window.FreePDF.formatBytes(totalBytes);
    this.el.summary.title = this.files.map((file) => file.name).join("\n");
  }
}
