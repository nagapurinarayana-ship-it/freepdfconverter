import { ToolController } from "../core/tool-controller.js";
import { createImageAdjuster } from "../core/image-adjuster.js";
import { createCanvas, loadImage, removeNearWhite, trimWhitespace } from "../core/image-tool-kit.js";
import { encodeBestUnderTarget } from "../core/image-form-engine.js";
import {
  reductionPercent,
  resolveDimensions,
  chooseExtension,
  targetBytesFromSelection
} from "../core/image-form-policy.js";

const MB = window.FreePDF.MB;
const MAX_FILE = 15 * MB;
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 100 * MB;

function revokeUrls(urls = []) {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.length = 0;
}

function escapeText(value) {
  return String(value).replace(/[&<>\"]/g, function (char) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char];
  });
}

async function prepareSignatureSource(image, autoTrim, removeBackground) {
  const { canvas, ctx } = createCanvas(image, {
    width: image.naturalWidth,
    height: image.naturalHeight,
    alpha: true
  });

  ctx.drawImage(image, 0, 0);

  if (removeBackground) removeNearWhite(canvas);

  return autoTrim ? trimWhitespace(canvas, removeBackground ? 245 : 250, 10) : canvas;
}

function renderPreview(url, container, label) {
  container.textContent = "";
  const figure = document.createElement("figure");
  figure.className = "image-preview-card";
  const image = document.createElement("img");
  image.alt = label;
  image.loading = "lazy";
  image.src = url;
  figure.appendChild(image);
  container.appendChild(figure);
}

function canvasToSource(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("encode-failed"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => resolve({
        image,
        url,
        width: canvas.width,
        height: canvas.height,
        suggestedCrop: { x: 0, y: 0, width: canvas.width, height: canvas.height }
      });
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("image-load-failed"));
      };
      image.src = url;
    }, "image/png");
  });
}

function dimensionsForEditor(el) {
  const mode = el.dimensionMode.value;
  return (mode === "exact" || mode === "physical") && !el.keepAspect.checked;
}

function resolveCropAspect(el, source) {
  const width = Number(el.width.value || 600);
  const height = Number(el.height.value || 200);
  if (dimensionsForEditor(el) && width > 0 && height > 0) return width / height;
  return source.naturalWidth / Math.max(1, source.naturalHeight);
}

async function prepareEditorSource(file, autoTrim, transparent) {
  const image = await loadImage(file);
  const preparedCanvas = await prepareSignatureSource(image, autoTrim, transparent);
  return canvasToSource(preparedCanvas);
}

export function mount() {
  async function showActiveEditor(files, state, el, index) {
    state.activeIndex = Math.max(0, Math.min(index, files.length - 1));
    const file = files[state.activeIndex];
    const transparent = el.background.value === "transparent";
    const autoTrim = el.autoTrim.checked;

    state.editorUrls = state.editorUrls || [];
    state.editorSources = state.editorSources || [];
    state.cropSelections = state.cropSelections || [];

    if (state.editorUrls[state.activeIndex]) {
      URL.revokeObjectURL(state.editorUrls[state.activeIndex]);
      state.editorUrls[state.activeIndex] = null;
    }

    const source = await prepareEditorSource(file, autoTrim, transparent);
    state.editorSources[state.activeIndex] = source;
    state.editorUrls[state.activeIndex] = source.url;

    if (!state.editor) {
      state.editor = createImageAdjuster({
        container: el.adjuster,
        aspectRatio: resolveCropAspect(el, source.image),
        label: "Signature framing"
      });
      state.editor.setOnChange((crop) => {
        state.cropSelections[state.activeIndex] = crop;
      });
    }

    state.editor.setAspectRatio(resolveCropAspect(el, source.image));
    state.editor.setSource(
      source,
      source.suggestedCrop,
      state.cropSelections[state.activeIndex] || null
    );
    state.editor.getNavigationApi().setNavigation({
      index: state.activeIndex,
      count: files.length,
      onPrevious: () => showActiveEditor(files, state, el, state.activeIndex - 1),
      onNext: () => showActiveEditor(files, state, el, state.activeIndex + 1)
    });

    el.adjuster.hidden = !dimensionsForEditor(el);
  }

  function syncBackgroundFormat(el) {
    const transparent = el.background.value === "transparent";
    if (transparent) {
      el.format.value = "image/png";
      el.format.disabled = true;
    } else {
      el.format.disabled = false;
    }
  }

  const controller = new ToolController({
    multiple: true,
    maxFiles: MAX_FILES,
    maxTotalFileBytes: MAX_TOTAL_BYTES,
    maxTotalFileMessage: "Keep the batch below 100 MB for reliable browser processing.",
    selectors: {
      zone: "#dropZone",
      input: "#signatureFile",
      summary: "#fileSummary",
      action: "#processButton",
      clear: "#clearButton",
      progress: "#progressBar",
      status: "#toolStatus",
      originalSize: "#originalSize",
      targetSize: "#targetSize",
      customTargetWrap: "#customTargetWrap",
      customTarget: "#customTarget",
      width: "#signatureWidth",
      height: "#signatureHeight",
      dimensionMode: "#dimensionMode",
      dimensionUnit: "#dimensionUnit",
      dpi: "#dpi",
      keepAspect: "#keepAspect",
      autoTrim: "#autoTrim",
      background: "#backgroundMode",
      format: "#outputFormat",
      inputPreview: "#inputPreview",
      outputPreview: "#outputPreview",
      outputSummary: "#outputSummary",
      resultList: "#resultList",
      batchCount: "#batchCount",
      batchSize: "#batchSize",
      adjuster: "#signatureAdjuster"
    },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name),
    invalidTypeMessage: "Choose JPG, PNG or WebP signature images only.",
    maxFileMessage: "Each signature image must be 15 MB or smaller.",
    emptySummary: "No signatures selected",
    initialMessage: "Select one or more signature images. Processing stays in your browser.",
    readyMessage: "Ready. Review the dimensions, background and target size, then prepare the signature file(s).",
    readErrorMessage: "One or more selected signature images could not be read by your browser.",
    onFilesSelected: async ({ files, state, el }) => {
      revokeUrls(state.previewUrls || []);
      revokeUrls(state.outputUrls || []);
      revokeUrls(state.editorUrls || []);

      state.previewUrls = files.map((file) => URL.createObjectURL(file));
      state.outputUrls = [];
      state.editorUrls = [];
      state.editorSources = [];
      state.cropSelections = [];
      state.activeIndex = 0;

      if (state.previewUrls[0]) renderPreview(state.previewUrls[0], el.inputPreview, files[0].name);
      el.batchCount.textContent = files.length + " selected";
      el.batchSize.textContent = window.FreePDF.formatBytes(files.reduce((sum, file) => sum + file.size, 0));
      el.outputSummary.textContent = "Not processed yet";
      el.resultList.textContent = "";

      await showActiveEditor(files, state, el, 0);
    },
    onReset: ({ state, el }) => {
      revokeUrls(state.previewUrls || []);
      revokeUrls(state.outputUrls || []);
      revokeUrls(state.editorUrls || []);
      state.editor?.destroy?.();

      state.previewUrls = [];
      state.outputUrls = [];
      state.editorUrls = [];
      state.editorSources = [];
      state.cropSelections = [];
      state.editor = null;
      state.activeIndex = 0;

      el.adjuster.hidden = true;
      el.batchCount.textContent = "0 selected";
      el.batchSize.textContent = "0 B";
      el.outputSummary.textContent = "Not processed yet";
      el.resultList.textContent = "";
      el.inputPreview.textContent = "";
      el.outputPreview.textContent = "";
      el.customTargetWrap.hidden = true;
    },
    onProcess: async ({ files, state, el, setProgress, setStatus, formatBytes, safeBaseName, downloadBlob }) => {
      const targetBytes = targetBytesFromSelection(el.targetSize.value, el.customTarget.value);
      const baseOptions = {
        mode: el.dimensionMode.value,
        width: Number(el.width.value || 600),
        height: Number(el.height.value || 200),
        unit: el.dimensionUnit.value,
        dpi: Number(el.dpi.value || 96),
        keepAspect: el.keepAspect.checked
      };
      const autoTrim = el.autoTrim.checked;
      const transparent = el.background.value === "transparent";
      const background = transparent ? "keep" : "white";
      const mime = transparent ? "image/png" : el.format.value;
      if (transparent) el.format.value = "image/png";
      const results = [];

      revokeUrls(state.outputUrls || []);
      state.outputUrls = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(
          "Preparing " + (index + 1) + " of " + files.length + " — " + file.name,
          "info"
        );

        let source = state.editorSources[index];
        if (!source) {
          source = await prepareEditorSource(file, autoTrim, transparent);
          state.editorSources[index] = source;
          state.editorUrls[index] = source.url;
        }
        const preparedImage = source.image;
        let cropSelection = state.cropSelections[index] || null;
        if (index === state.activeIndex && state.editor?.getCropRect) {
          cropSelection = state.editor.getCropRect() || cropSelection;
          if (cropSelection) state.cropSelections[index] = cropSelection;
        }

        const dimensions = resolveDimensions({
          ...baseOptions,
          sourceWidth: preparedImage.naturalWidth,
          sourceHeight: preparedImage.naturalHeight
        });

        const result = await encodeBestUnderTarget({
          image: preparedImage,
          dimensions,
          mime,
          targetBytes,
          cropMode: dimensionsForEditor(el) ? "fill" : "contain",
          background,
          cropRect: dimensionsForEditor(el) ? cropSelection : null,
          setProgress,
          progressStart: (index / files.length) * 75,
          progressEnd: ((index + 1) / files.length) * 75
        });

        if (!result) throw new Error("encode-failed");

        const outputUrl = URL.createObjectURL(result.blob);
        state.outputUrls.push(outputUrl);

        results.push({
          file,
          blob: result.blob,
          url: outputUrl,
          width: result.width,
          height: result.height,
          reached: result.reached,
          reduction: reductionPercent(file.size, result.blob.size)
        });

        if (index === 0) {
          renderPreview(outputUrl, el.outputPreview, "Prepared signature preview for " + file.name);
        }
      }

      for (const result of results) {
        downloadBlob(
          result.blob,
          safeBaseName(result.file.name) + "-signature." + chooseExtension(mime)
        );
      }

      el.outputSummary.textContent =
        results.length + " file" + (results.length === 1 ? "" : "s") +
        " prepared · target " + formatBytes(targetBytes);

      el.resultList.textContent = "";
      for (const result of results) {
        const row = document.createElement("div");
        row.className = "result-row";
        row.innerHTML =
          "<strong>" + escapeText(result.file.name) + "</strong>" +
          "<span>" + formatBytes(result.file.size) + " → " + formatBytes(result.blob.size) +
          " · " + result.width + "×" + result.height + " px · " +
          result.reduction.toFixed(1) + "% smaller" +
          (result.reached ? " · target met" : " · closest safe result") +
          "</span>";

        const link = document.createElement("a");
        link.href = result.url;
        link.download = safeBaseName(result.file.name) + "-signature." + chooseExtension(mime);
        link.textContent = "Download";
        row.appendChild(link);
        el.resultList.appendChild(row);
      }

      setProgress(100);
      setStatus(
        results.length > 1
          ? "Done — prepared " + results.length + " files. Individual downloads were started. Your browser may ask to allow multiple downloads."
          : "Done — prepared the signature and started the download.",
        "success"
      );
    },
    onError: (error, { setStatus }) => {
      const message =
        error?.message === "encode-failed"
          ? "The browser could not encode the signature. Try a larger target or a different output format."
          : "The selected signature images could not be prepared in your browser.";
      setStatus(message, "error");
    }
  });

  controller.mount();
  controller.el.dpi.hidden = controller.el.dimensionUnit.value === "px";
  syncBackgroundFormat(controller.el);

  controller.el.targetSize.addEventListener("change", function () {
    controller.el.customTargetWrap.hidden = controller.el.targetSize.value !== "custom";
  });

  controller.el.background.addEventListener("change", function () {
    syncBackgroundFormat(controller.el);
    if (controller.ready && controller.files.length) {
      showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0);
    }
  });

  controller.el.autoTrim.addEventListener("change", function () {
    if (controller.ready && controller.files.length) {
      showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0);
    }
  });

  function refreshEditorMode() {
    const visible = dimensionsForEditor(controller.el);
    controller.el.adjuster.hidden = !visible;
    if (visible && controller.ready && controller.files.length) {
      showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0);
    }
  }

  controller.el.dimensionMode.addEventListener("change", function () {
    controller.el.dimensionUnit.disabled = controller.el.dimensionMode.value === "original";
    controller.el.dpi.disabled = controller.el.dimensionMode.value !== "physical";
    refreshEditorMode();
  });

  controller.el.dimensionUnit.addEventListener("change", function () {
    controller.el.dpi.hidden = controller.el.dimensionUnit.value === "px";
    refreshEditorMode();
  });

  controller.el.keepAspect.addEventListener("change", refreshEditorMode);
  controller.el.width.addEventListener("input", refreshEditorMode);
  controller.el.height.addEventListener("input", refreshEditorMode);
}
