import { ToolController } from "../core/tool-controller.js";
import { createImageAdjuster } from "../core/image-adjuster.js";
import { createCanvas, loadImage, trimWhitespace } from "../core/image-tool-kit.js";
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

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function removeSignaturePaperBackground(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  const edgeSamples = [];

  const sampleStepX = Math.max(1, Math.floor(width / 160));
  const sampleStepY = Math.max(1, Math.floor(height / 80));

  function addSample(x, y) {
    const index = (y * width + x) * 4;
    if (data[index + 3] < 8) return;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    edgeSamples.push(0.299 * r + 0.587 * g + 0.114 * b);
  }

  for (let x = 0; x < width; x += sampleStepX) {
    addSample(x, 0);
    addSample(x, height - 1);
  }

  for (let y = 0; y < height; y += sampleStepY) {
    addSample(0, y);
    addSample(width - 1, y);
  }

  const backgroundLuma = median(edgeSamples);
  if (!Number.isFinite(backgroundLuma) || backgroundLuma <= 0) return;

  // Scanned paper is often gray/off-white instead of pure white. Use the
  // observed page tone to remove the paper while preserving dark ink.
  const cutoff = Math.max(24, backgroundLuma * 0.25);
  const feather = Math.max(10, backgroundLuma * 0.08);

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 8) continue;

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const contrast = backgroundLuma - luma;

    if (contrast >= cutoff) {
      data[index + 3] = 255;
    } else if (contrast >= cutoff - feather) {
      const keep = (contrast - (cutoff - feather)) / feather;
      data[index + 3] = Math.round(255 * Math.max(0, Math.min(1, keep)));
    } else {
      data[index + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

async function prepareSignatureSource(image, autoTrim, removeBackground) {
  const { canvas, ctx } = createCanvas(image, {
    width: image.naturalWidth,
    height: image.naturalHeight,
    alpha: true
  });

  ctx.drawImage(image, 0, 0);

  if (removeBackground) removeSignaturePaperBackground(canvas);

  return autoTrim ? trimWhitespace(canvas, removeBackground ? 245 : 250, 10) : canvas;
}

function renderPreview(url, container, label, options = {}) {
  container.textContent = "";
  const figure = document.createElement("figure");
  figure.className = "image-preview-card";

  if (options.transparent) {
    figure.title = "Transparent PNG preview";
    figure.style.backgroundImage =
      "linear-gradient(45deg, #e7e9ee 25%, transparent 25%)," +
      "linear-gradient(-45deg, #e7e9ee 25%, transparent 25%)," +
      "linear-gradient(45deg, transparent 75%, #e7e9ee 75%)," +
      "linear-gradient(-45deg, transparent 75%, #e7e9ee 75%)";
    figure.style.backgroundSize = "16px 16px";
    figure.style.backgroundPosition = "0 0, 0 8px, 8px -8px, -8px 0";
    figure.style.backgroundColor = "#ffffff";

    const badge = document.createElement("span");
    badge.textContent = "Transparent PNG";
    badge.style.display = "inline-block";
    badge.style.margin = "0 0 8px";
    badge.style.padding = "4px 8px";
    badge.style.borderRadius = "999px";
    badge.style.background = "rgba(255,255,255,.92)";
    badge.style.border = "1px solid rgba(22,38,62,.14)";
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "700";
    badge.style.color = "#24344d";
    figure.appendChild(badge);
  }

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

async function validatePreparedSignature(blob, transparent) {
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("output-validation-failed"));
      element.src = url;
    });

    const maxDimension = 256;
    const scale = Math.min(
      1,
      maxDimension / Math.max(1, image.naturalWidth),
      maxDimension / Math.max(1, image.naturalHeight)
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!transparent) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    let meaningfulPixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (transparent) {
        if (alpha > 8) meaningfulPixels += 1;
      } else if (
        alpha > 8 &&
        (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245)
      ) {
        meaningfulPixels += 1;
      }
    }

    if (meaningfulPixels === 0) {
      throw new Error(
        transparent ? "blank-transparent-output" : "blank-signature-output"
      );
    }
  } finally {
    URL.revokeObjectURL(url);
  }
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

function buildSuggestedCrop(source, aspectRatio) {
  const sourceWidth = Math.max(1, Number(source.width) || 1);
  const sourceHeight = Math.max(1, Number(source.height) || 1);
  const ratio = Math.max(0.05, Number(aspectRatio) || (sourceWidth / sourceHeight));

  let width = sourceWidth;
  let height = sourceHeight;

  if (sourceWidth / sourceHeight > ratio) {
    width = sourceHeight * ratio;
  } else {
    height = sourceWidth / ratio;
  }

  return {
    x: Math.max(0, (sourceWidth - width) / 2),
    y: Math.max(0, (sourceHeight - height) / 2),
    width,
    height
  };
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
    source.suggestedCrop = buildSuggestedCrop(
      source,
      resolveCropAspect(el, source.image)
    );
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

        try {
          await validatePreparedSignature(result.blob, transparent);
        } catch (error) {
          error.message = error.message + ":" + file.name;
          throw error;
        }

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
          renderPreview(
            outputUrl,
            el.outputPreview,
            transparent
              ? "Prepared transparent signature preview for " + file.name
              : "Prepared signature preview for " + file.name,
            { transparent }
          );
        }
      }

      for (const result of results) {
        downloadBlob(
          result.blob,
          safeBaseName(result.file.name) + "-signature." + chooseExtension(mime)
        );
      }

      const targetMissed = results.some((result) => !result.reached);
      el.outputSummary.textContent =
        results.length + " file" + (results.length === 1 ? "" : "s") +
        " prepared · target " + formatBytes(targetBytes) +
        (transparent ? " · transparent PNG" : "") +
        (targetMissed
          ? transparent
            ? " · closest safe result for one or more files (PNG transparency is lossless)"
            : " · closest safe result for one or more files"
          : " · target met");

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
          : /^blank-transparent-output:/.test(error?.message || "")
            ? "The transparent result appears empty. Keep the signature visible in the framing box and try again."
            : /^blank-signature-output:/.test(error?.message || "")
              ? "The prepared signature appears empty. Adjust the framing so the signature is inside the output box and try again."
              : /^output-validation-failed:/.test(error?.message || "")
                ? "The prepared file could not be verified. Try preparing the signature again."
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
      controller.state.cropSelections[controller.state.activeIndex || 0] = null;
      showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0);
    }
  });

  controller.el.autoTrim.addEventListener("change", function () {
    if (controller.ready && controller.files.length) {
      controller.state.cropSelections[controller.state.activeIndex || 0] = null;
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
