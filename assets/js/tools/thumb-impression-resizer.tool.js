import { ToolController } from "../core/tool-controller.js";
import { createImageAdjuster } from "../core/image-adjuster.js";
import { createCanvas, loadImage, makeBlob, removeNearWhite, trimWhitespace } from "../core/image-tool-kit.js";
import { encodeBestUnderTarget } from "../core/image-form-engine.js";
import {
  chooseExtension,
  reductionPercent,
  resolveDimensions,
  targetBytesFromSelection
} from "../core/image-form-policy.js";

const MB = window.FreePDF.MB;
const MAX_FILE = 15 * MB;
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 100 * MB;

const PRESETS = Object.freeze({
  "300": { width: 300, height: 300, unit: "px", label: "300 × 300 px" },
  "600": { width: 600, height: 600, unit: "px", label: "600 × 600 px" }
});

function revokeUrls(urls = []) {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.length = 0;
}

function escapeText(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  })[char]);
}

async function prepareThumbSource(image, autoTrim, removeBackground) {
  const { canvas, ctx } = createCanvas(image, {
    width: image.naturalWidth,
    height: image.naturalHeight,
    alpha: true
  });

  ctx.drawImage(image, 0, 0);

  if (removeBackground) removeNearWhite(canvas, 250);

  return autoTrim
    ? trimWhitespace(canvas, 250, 10)
    : canvas;
}

async function canvasToSource(canvas) {
  const blob = await makeBlob(canvas, "image/png");
  if (!blob) throw new Error("encode-failed");

  const url = URL.createObjectURL(blob);
  const image = await new Promise((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("image-load-failed"));
    nextImage.src = url;
  });

  return {
    image,
    url,
    width: canvas.width,
    height: canvas.height,
    suggestedCrop: { x: 0, y: 0, width: canvas.width, height: canvas.height }
  };
}

function buildSmartThumbCrop(image, aspectRatio) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const sourceRatio = sourceWidth / Math.max(1, sourceHeight);

  let width = sourceWidth;
  let height = sourceHeight;
  if (sourceRatio > aspectRatio) {
    width = sourceHeight * aspectRatio;
  } else {
    height = sourceWidth / aspectRatio;
  }

  return {
    x: Math.max(0, (sourceWidth - width) / 2),
    y: Math.max(0, (sourceHeight - height) / 2),
    width,
    height
  };
}

function renderPreview(url, container, label, options = {}) {
  container.textContent = "";
  const figure = document.createElement("figure");
  figure.className = "image-preview-card";

  if (options.transparent) {
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

function updateCustomFields(el) {
  el.customFields.hidden = el.preset.value !== "custom";
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

async function validatePreparedThumb(blob, transparent) {
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
        transparent ? "blank-transparent-output" : "blank-thumb-output"
      );
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

  async function showActiveEditor(files, state, el, index, resetCrop = false) {
    state.activeIndex = Math.max(0, Math.min(index, files.length - 1));
    const file = files[state.activeIndex];
    const removeBackground = el.background.value === "transparent";

    state.editorUrls = state.editorUrls || [];
    state.editorSources = state.editorSources || [];
    state.cropSelections = state.cropSelections || [];

    if (state.editorUrls[state.activeIndex]) {
      URL.revokeObjectURL(state.editorUrls[state.activeIndex]);
      state.editorUrls[state.activeIndex] = null;
    }

    const rawSource = await loadImage(file);
    const preparedCanvas = await prepareThumbSource(
      rawSource,
      el.autoTrim.checked,
      removeBackground
    );
    const source = await canvasToSource(preparedCanvas);
    state.editorSources[state.activeIndex] = source;
    state.editorUrls[state.activeIndex] = source.url;

    if (resetCrop) {
      state.cropSelections[state.activeIndex] = null;
    }

    const preset = el.preset.value === "custom"
      ? {
          width: Number(el.width.value || 600),
          height: Number(el.height.value || 600),
          unit: el.unit.value,
          dpi: Number(el.dpi.value || 96),
          label: "Custom size"
        }
      : PRESETS[el.preset.value];

    const requestedDimensions = resolveDimensions({
      mode: "exact",
      width: preset.width,
      height: preset.height,
      unit: preset.unit,
      dpi: preset.dpi,
      sourceWidth: source.width,
      sourceHeight: source.height,
      keepAspect: false
    });

    const aspectRatio = requestedDimensions.width / Math.max(1, requestedDimensions.height);
    const suggestedCrop = buildSmartThumbCrop(source.image, aspectRatio);
    source.suggestedCrop = suggestedCrop;

    el.adjuster.hidden = false;

    if (!state.editor) {
      state.editor = createImageAdjuster({
        container: el.adjuster,
        aspectRatio,
        label: "Thumb impression framing",
        instructions: "Drag to move · pinch or wheel to zoom. Keep the complete thumb impression inside the frame."
      });
      state.editor.setOnChange((crop) => {
        state.cropSelections[state.activeIndex] = crop;
      });
    } else {
      state.editor.setAspectRatio(aspectRatio);
    }

    state.editor.setAspectRatio(aspectRatio);
    state.editor.setSource(
      source,
      suggestedCrop,
      state.cropSelections[state.activeIndex] || suggestedCrop
    );
    state.editor.getNavigationApi().setNavigation({
      index: state.activeIndex,
      count: files.length,
      onPrevious: () => showActiveEditor(files, state, el, state.activeIndex - 1),
      onNext: () => showActiveEditor(files, state, el, state.activeIndex + 1)
    });
  }

export function mount() {
  const controller = new ToolController({
    multiple: true,
    maxFiles: MAX_FILES,
    maxTotalFileBytes: MAX_TOTAL_BYTES,
    maxTotalFileMessage: "Keep the batch below 100 MB for reliable browser processing.",
    selectors: {
      zone: "#dropZone",
      input: "#thumbFile",
      summary: "#fileSummary",
      action: "#processButton",
      clear: "#clearButton",
      progress: "#progressBar",
      status: "#toolStatus",
      originalSize: "#originalSize",
      preset: "#preset",
      customFields: "#customFields",
      width: "#thumbWidth",
      height: "#thumbHeight",
      unit: "#thumbUnit",
      dpi: "#dpi",
      targetSize: "#targetSize",
      customTargetWrap: "#customTargetWrap",
      customTarget: "#customTarget",
      autoTrim: "#autoTrim",
      background: "#backgroundMode",
      format: "#outputFormat",
      inputPreview: "#inputPreview",
      outputPreview: "#outputPreview",
      outputSummary: "#outputSummary",
      resultList: "#resultList",
      batchCount: "#batchCount",
      batchSize: "#batchSize",
      adjuster: "#thumbAdjuster"
    },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name),
    invalidTypeMessage: "Choose JPG, PNG or WebP thumb-impression images only.",
    maxFileMessage: "Each thumb-impression image must be 15 MB or smaller.",
    emptySummary: "No thumb impressions selected",
    initialMessage: "Select a thumb-impression image. Processing stays in your browser.",
    readyMessage: "Ready. Choose the dimensions and file-size limit, then prepare the image file(s).",
    readErrorMessage: "One or more selected thumb-impression images could not be read.",
    onFilesSelected: async ({ files, state, el }) => {
      revokeUrls(state.previewUrls || []);
      revokeUrls(state.outputUrls || []);
      revokeUrls(state.editorUrls || []);

      state.previewUrls = files.map((file) => URL.createObjectURL(file));
      state.outputUrls = [];
      state.editorUrls = [];
      state.editorSources = [];
      state.cropSelections = [];
      state.images = [];
      state.activeIndex = 0;

      if (state.previewUrls[0]) {
        renderPreview(state.previewUrls[0], el.inputPreview, files[0].name);
      }

      el.batchCount.textContent = files.length + " selected";
      el.batchSize.textContent = window.FreePDF.formatBytes(
        files.reduce((sum, file) => sum + file.size, 0)
      );
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
      state.images = [];
      state.editor = null;
      state.activeIndex = 0;

      el.adjuster.hidden = true;
      el.batchCount.textContent = "0 selected";
      el.batchSize.textContent = "0 B";
      el.outputSummary.textContent = "Not processed yet";
      el.resultList.textContent = "";
      el.inputPreview.textContent = "";
      el.outputPreview.textContent = "";
      updateCustomFields(el);
    },
    onProcess: async ({ files, state, el, setProgress, setStatus, formatBytes, safeBaseName, downloadBlob }) => {
      const preset = el.preset.value === "custom"
        ? {
            width: Number(el.width.value || 600),
            height: Number(el.height.value || 600),
            unit: el.unit.value,
            dpi: Number(el.dpi.value || 96),
            label: "Custom size"
          }
        : PRESETS[el.preset.value];

      const targetBytes = targetBytesFromSelection(el.targetSize.value, el.customTarget.value);
      const removeBackground = el.background.value === "transparent";
      const background = removeBackground ? "keep" : "white";
      const mime = removeBackground ? "image/png" : el.format.value;
      if (removeBackground) el.format.value = "image/png";
      const results = [];

      revokeUrls(state.outputUrls || []);
      state.outputUrls = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(
          "Preparing " + (index + 1) + " of " + files.length + " — " + file.name,
          "info"
        );

        let editorSource = state.editorSources[index];
        if (!editorSource) {
          const rawSource = await loadImage(file);
          const preparedCanvas = await prepareThumbSource(
            rawSource,
            el.autoTrim.checked,
            removeBackground
          );
          editorSource = await canvasToSource(preparedCanvas);
          state.editorSources[index] = editorSource;
          state.editorUrls[index] = editorSource.url;
        }

        const preparedImage = editorSource.image;
        let cropSelection = state.cropSelections[index] || buildSmartThumbCrop(
          preparedImage,
          (preset.width / Math.max(1, preset.height))
        );
        if (index === state.activeIndex && state.editor?.getCropRect) {
          cropSelection = state.editor.getCropRect() || cropSelection;
          if (cropSelection) state.cropSelections[index] = cropSelection;
        }

        const dimensions = resolveDimensions({
          mode: "exact",
          width: preset.width,
          height: preset.height,
          unit: preset.unit,
          dpi: preset.dpi,
          sourceWidth: preparedImage.naturalWidth,
          sourceHeight: preparedImage.naturalHeight,
          keepAspect: false
        });

        const result = await encodeBestUnderTarget({
          image: preparedImage,
          dimensions,
          mime,
          targetBytes,
          cropMode: "fill",
          background,
          cropFocusX: 0.5,
          cropFocusY: 0.5,
          cropRect: cropSelection,
          setProgress,
          progressStart: (index / files.length) * 75,
          progressEnd: ((index + 1) / files.length) * 75
        });

        if (!result) throw new Error("encode-failed");

        try {
          await validatePreparedThumb(result.blob, removeBackground);
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
            removeBackground
              ? "Prepared transparent thumb-impression preview for " + file.name
              : "Prepared thumb-impression preview for " + file.name,
            { transparent: removeBackground }
          );
        }
      }

      for (const result of results) {
        downloadBlob(
          result.blob,
          safeBaseName(result.file.name) + "-thumb-impression." + chooseExtension(mime)
        );
      }

      const targetMissed = results.some((result) => !result.reached);
      el.outputSummary.textContent =
        results.length + " file" + (results.length === 1 ? "" : "s") +
        " prepared · " + preset.label + " · " + formatBytes(targetBytes) + " maximum" +
        (removeBackground ? " · transparent PNG" : "") +
        (targetMissed
          ? " · closest safe result for one or more files"
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
        link.download =
          safeBaseName(result.file.name) + "-thumb-impression." + chooseExtension(mime);
        link.textContent = "Download";
        row.appendChild(link);
        el.resultList.appendChild(row);
      }

      setProgress(100);
      setStatus(
        results.length > 1
          ? "Done — prepared " + results.length + " thumb impressions. Individual downloads were started. Your browser may ask to allow multiple downloads."
          : "Done — thumb impression prepared and direct download started.",
        "success"
      );
    },
    onError: (error, { setStatus }) => {
      setStatus(
        error?.message === "encode-failed"
          ? "The browser could not encode the image. Try a larger target size or JPG output."
          : /^blank-transparent-output:/.test(error?.message || "")
            ? "The transparent result appears empty. Keep the thumb impression inside the framing box and try again."
            : /^blank-thumb-output:/.test(error?.message || "")
              ? "The prepared thumb impression appears empty. Adjust the framing so the impression is inside the output box and try again."
              : /^output-validation-failed:/.test(error?.message || "")
                ? "The prepared file could not be verified. Try preparing the thumb impression again."
                : "The selected thumb-impression image could not be prepared in your browser.",
        "error"
      );
    }
  });

  controller.mount();
  syncBackgroundFormat(controller.el);

  controller.el.preset.addEventListener("change", async () => {
    updateCustomFields(controller.el);
    if (controller.ready && controller.files.length) {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  });

  controller.el.targetSize.addEventListener("change", () => {
    controller.el.customTargetWrap.hidden = controller.el.targetSize.value !== "custom";
  });

  controller.el.background.addEventListener("change", async () => {
    syncBackgroundFormat(controller.el);
    if (controller.ready && controller.files.length) {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  });

  controller.el.autoTrim.addEventListener("change", async () => {
    if (controller.ready && controller.files.length) {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  });

  const refreshCustomFraming = async () => {
    if (controller.ready && controller.files.length && controller.el.preset.value === "custom") {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  };

  controller.el.width.addEventListener("input", refreshCustomFraming);
  controller.el.height.addEventListener("input", refreshCustomFraming);
  controller.el.unit.addEventListener("change", refreshCustomFraming);
  controller.el.dpi.addEventListener("change", refreshCustomFraming);

  updateCustomFields(controller.el);
}
