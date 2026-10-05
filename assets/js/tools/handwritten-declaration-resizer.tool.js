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

function revokeUrls(urls = []) {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.length = 0;
}

function escapeText(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  })[char]);
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

function buildSmartCrop(image, aspectRatio) {
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

function croppingIsActive(el) {
  return el.dimensionMode.value === "exact" && !el.keepAspect.checked;
}

async function prepareSource(image, autoTrim, removeBackground) {
  const { canvas, ctx } = createCanvas(image, {
    width: image.naturalWidth,
    height: image.naturalHeight,
    alpha: true
  });

  ctx.drawImage(image, 0, 0);

  if (removeBackground) removeNearWhite(canvas);

  return autoTrim
    ? trimWhitespace(canvas, removeBackground ? 245 : 250, 10)
    : canvas;
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

export function mount() {
  async function showActiveEditor(files, state, el, index, resetCrop = false) {
    state.activeIndex = Math.max(0, Math.min(index, files.length - 1));
    const file = files[state.activeIndex];
    const active = croppingIsActive(el);

    if (!active) {
      el.adjuster.hidden = true;
      return;
    }

    state.editorUrls = state.editorUrls || [];
    state.editorSources = state.editorSources || [];
    state.cropSelections = state.cropSelections || [];

    if (state.editorUrls[state.activeIndex]) {
      URL.revokeObjectURL(state.editorUrls[state.activeIndex]);
      state.editorUrls[state.activeIndex] = null;
    }

    const originalImage = await loadImage(file);
    const preparedCanvas = await prepareSource(
      originalImage,
      el.autoTrim.checked,
      el.background.value === "transparent"
    );
    const source = await canvasToSource(preparedCanvas);
    state.editorSources[state.activeIndex] = source;
    state.editorUrls[state.activeIndex] = source.url;

    const dimensions = resolveDimensions({
      mode: "exact",
      width: Number(el.width.value || 1200),
      height: Number(el.height.value || 800),
      unit: el.dimensionUnit.value,
      dpi: Number(el.dpi.value || 96),
      keepAspect: false,
      sourceWidth: source.width,
      sourceHeight: source.height
    });
    const aspectRatio = dimensions.width / Math.max(1, dimensions.height);
    const suggestedCrop = buildSmartCrop(source.image, aspectRatio);
    source.suggestedCrop = suggestedCrop;

    if (resetCrop) {
      state.cropSelections[state.activeIndex] = null;
    }

    el.adjuster.hidden = false;

    if (!state.editor) {
      state.editor = createImageAdjuster({
        container: el.adjuster,
        aspectRatio,
        label: "Declaration framing",
        instructions: "Drag to move · pinch or wheel to zoom. Keep every important handwritten line inside the frame."
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

  const controller = new ToolController({
    multiple: true,
    maxFiles: MAX_FILES,
    maxTotalFileBytes: MAX_TOTAL_BYTES,
    maxTotalFileMessage: "Keep the batch below 100 MB for reliable browser processing.",
    selectors: {
      zone: "#dropZone",
      input: "#declarationFile",
      summary: "#fileSummary",
      action: "#processButton",
      clear: "#clearButton",
      progress: "#progressBar",
      status: "#toolStatus",
      originalSize: "#originalSize",
      targetSize: "#targetSize",
      customTargetWrap: "#customTargetWrap",
      customTarget: "#customTarget",
      width: "#declarationWidth",
      height: "#declarationHeight",
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
      adjuster: "#declarationAdjuster"
    },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name),
    invalidTypeMessage: "Choose JPG, PNG or WebP handwritten-declaration images only.",
    maxFileMessage: "Each declaration image must be 15 MB or smaller.",
    emptySummary: "No declarations selected",
    initialMessage: "Select one or more declaration images. Processing stays in your browser.",
    readyMessage: "Ready. Review the dimensions, cleanup and target size, then prepare the declaration file(s).",
    readErrorMessage: "One or more handwritten-declaration images could not be read by your browser.",
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
      el.customTargetWrap.hidden = true;
    },
    onProcess: async ({ files, state, el, setProgress, setStatus, formatBytes, safeBaseName, downloadBlob }) => {
      const targetBytes = targetBytesFromSelection(el.targetSize.value, el.customTarget.value);
      const baseOptions = {
        mode: el.dimensionMode.value,
        width: Number(el.width.value || 1200),
        height: Number(el.height.value || 800),
        unit: el.dimensionUnit.value,
        dpi: Number(el.dpi.value || 96),
        keepAspect: el.keepAspect.checked
      };
      const removeBackground = el.background.value === "transparent";
      const background = removeBackground ? "keep" : "white";
      const mime = el.format.value;
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
          const originalImage = await loadImage(file);
          const preparedCanvas = await prepareSource(
            originalImage,
            el.autoTrim.checked,
            removeBackground
          );
          editorSource = await canvasToSource(preparedCanvas);
          state.editorSources[index] = editorSource;
          state.editorUrls[index] = editorSource.url;
        }

        const preparedImage = editorSource.image;

        const dimensions = resolveDimensions({
          ...baseOptions,
          sourceWidth: preparedImage.naturalWidth,
          sourceHeight: preparedImage.naturalHeight
        });

        const useContain = !croppingIsActive(el);
        const cropSelection = croppingIsActive(el)
          ? (state.cropSelections[index] || buildSmartCrop(
              preparedImage,
              dimensions.width / Math.max(1, dimensions.height)
            ))
          : null;

        const result = await encodeBestUnderTarget({
          image: preparedImage,
          dimensions,
          mime,
          targetBytes,
          cropMode: useContain ? "contain" : "fill",
          background,
          cropFocusX: 0.5,
          cropFocusY: 0.5,
          cropRect: cropSelection,
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
          renderPreview(
            outputUrl,
            el.outputPreview,
            "Prepared handwritten declaration preview for " + file.name
          );
        }
      }

      for (const result of results) {
        downloadBlob(
          result.blob,
          safeBaseName(result.file.name) + "-handwritten-declaration." + chooseExtension(mime)
        );
      }

      el.outputSummary.textContent =
        results.length + " file" + (results.length === 1 ? "" : "s") +
        " prepared · target " + formatBytes(targetBytes) + " maximum";

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
          safeBaseName(result.file.name) + "-handwritten-declaration." + chooseExtension(mime);
        link.textContent = "Download";
        row.appendChild(link);
        el.resultList.appendChild(row);
      }

      setProgress(100);
      setStatus(
        results.length > 1
          ? "Done — prepared " + results.length + " handwritten declarations. Individual downloads were started. Your browser may ask to allow multiple downloads."
          : "Done — handwritten declaration prepared and direct download started.",
        "success"
      );
    },
    onError: (error, { setStatus }) => {
      setStatus(
        error?.message === "encode-failed"
          ? "The browser could not encode the declaration. Try a larger target or a different output format."
          : "The selected handwritten-declaration image could not be prepared in your browser.",
        "error"
      );
    }
  });

  controller.mount();

  const refreshEditor = async (resetCrop = true) => {
    if (controller.ready && controller.files.length) {
      await showActiveEditor(
        controller.files,
        controller.state,
        controller.el,
        controller.state.activeIndex || 0,
        resetCrop
      );
    }
  };

  controller.el.targetSize.addEventListener("change", () => {
    controller.el.customTargetWrap.hidden = controller.el.targetSize.value !== "custom";
  });

  controller.el.dimensionMode.addEventListener("change", async () => {
    const mode = controller.el.dimensionMode.value;
    controller.el.dimensionUnit.disabled = mode === "original";
    controller.el.dpi.disabled = mode !== "physical";
    await refreshEditor();
  });

  controller.el.dimensionUnit.addEventListener("change", async () => {
    controller.el.dpi.hidden = controller.el.dimensionUnit.value === "px";
    await refreshEditor();
  });

  controller.el.dpi.addEventListener("change", refreshEditor);
  controller.el.keepAspect.addEventListener("change", refreshEditor);
  controller.el.autoTrim.addEventListener("change", refreshEditor);
  controller.el.background.addEventListener("change", refreshEditor);

  const refreshCustomDimensions = () => refreshEditor();
  controller.el.width.addEventListener("input", refreshCustomDimensions);
  controller.el.height.addEventListener("input", refreshCustomDimensions);

  controller.el.dpi.hidden = controller.el.dimensionUnit.value === "px";
}
