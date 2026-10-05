import { ToolController } from "../core/tool-controller.js";
import { createImageAdjuster } from "../core/image-adjuster.js";
import { loadImage } from "../core/image-tool-kit.js";
import { encodeBestUnderTarget } from "../core/image-form-engine.js";
import {
  QUALITY_LADDER,
  WIDTH_LADDER,
  chooseExtension,
  clampPixels,
  isTargetReached,
  reductionPercent,
  resolveDimensions,
  targetBytesFromSelection
} from "../core/image-form-policy.js";

const MB = window.FreePDF.MB;
const MAX_FILE = 25 * MB;
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 100 * MB;

function revokeUrls(urls = []) {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.length = 0;
}

function escapeText(value) {
  return String(value).replace(/[&<>"]/g, function (char) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char];
  });
}

function renderPreview(url, container, label, options = {}) {
  container.textContent = "";
  const figure = document.createElement("figure");
  figure.className = "image-preview-card";

  if (options.transparent) {
    figure.title = "Transparent output preview";
    figure.style.backgroundImage =
      "linear-gradient(45deg,#e7e9ee 25%,transparent 25%)," +
      "linear-gradient(-45deg,#e7e9ee 25%,transparent 25%)," +
      "linear-gradient(45deg,transparent 75%,#e7e9ee 75%)," +
      "linear-gradient(-45deg,transparent 75%,#e7e9ee 75%)";
    figure.style.backgroundSize = "16px 16px";
    figure.style.backgroundPosition = "0 0,0 8px,8px -8px,-8px 0";
    figure.style.backgroundColor = "#ffffff";

    const badge = document.createElement("span");
    badge.textContent = "Transparent output";
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

async function validateOutputPhoto(blob) {
  if (!blob || blob.size <= 0 || !/^image\//i.test(blob.type || "")) {
    throw new Error("output-validation-failed");
  }

  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("output-validation-failed"));
      element.src = url;
    });

    if (
      !Number.isFinite(image.naturalWidth) ||
      !Number.isFinite(image.naturalHeight) ||
      image.naturalWidth < 1 ||
      image.naturalHeight < 1
    ) {
      throw new Error("output-validation-failed");
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

function framingIsActive(el) {
  const mode = el.dimensionMode.value;
  return (mode === "exact" || mode === "physical") && !el.keepAspect.checked;
}

function resolveCropAspect(el, source) {
  const width = Number(el.width.value || 1600);
  const height = Number(el.height.value || 1200);
  if (framingIsActive(el) && width > 0 && height > 0) {
    return width / height;
  }
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

export function mount() {
  async function showActiveEditor(files, state, el, index) {
    state.activeIndex = Math.max(0, Math.min(index, files.length - 1));
    const file = files[state.activeIndex];

    state.editorUrls = state.editorUrls || [];
    state.editorSources = state.editorSources || [];
    state.cropSelections = state.cropSelections || [];

    if (state.editorUrls[state.activeIndex]) {
      URL.revokeObjectURL(state.editorUrls[state.activeIndex]);
      state.editorUrls[state.activeIndex] = null;
    }

    const image = await loadImage(file);
    const url = URL.createObjectURL(file);
    const source = {
      image,
      url,
      width: image.naturalWidth,
      height: image.naturalHeight
    };

    source.suggestedCrop = buildSuggestedCrop(
      source,
      resolveCropAspect(el, image)
    );
    state.editorSources[state.activeIndex] = source;
    state.editorUrls[state.activeIndex] = url;

    if (!state.editor) {
      state.editor = createImageAdjuster({
        container: el.adjuster,
        aspectRatio: resolveCropAspect(el, image),
        label: "Photo framing",
        instructions: "Drag to reposition · pinch or wheel to zoom"
      });
      state.editor.setOnChange((crop) => {
        state.cropSelections[state.activeIndex] = crop;
      });
    }

    state.editor.setAspectRatio(resolveCropAspect(el, image));
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

    el.adjuster.hidden = !framingIsActive(el);
  }

  function refreshEditorMode(controller) {
    const visible = framingIsActive(controller.el);
    controller.el.adjuster.hidden = !visible;

    if (!visible) return;
    if (controller.ready && controller.files.length) {
      showActiveEditor(
        controller.files,
        controller.state,
        controller.el,
        controller.state.activeIndex || 0
      );
    }
  }

  const controller = new ToolController({
    multiple: true,
    maxFiles: MAX_FILES,
    maxTotalFileBytes: MAX_TOTAL_BYTES,
    maxTotalFileMessage: "Keep the batch below 100 MB for reliable browser processing.",
    selectors: {
      zone: "#dropZone",
      input: "#imageFile",
      summary: "#fileSummary",
      action: "#compressButton",
      clear: "#clearButton",
      progress: "#progressBar",
      status: "#toolStatus",
      originalSize: "#originalSize",
      targetSize: "#targetSize",
      customTargetWrap: "#customTargetWrap",
      customTarget: "#customTarget",
      outputFormat: "#outputFormat",
      dimensionMode: "#dimensionMode",
      dimensionFields: "#dimensionFields",
      dimensionUnit: "#dimensionUnit",
      width: "#width",
      height: "#height",
      dpi: "#dpi",
      keepAspect: "#keepAspect",
      cropMode: "#cropMode",
      background: "#background",
      batchCount: "#batchCount",
      batchSize: "#batchSize",
      inputPreview: "#inputPreview",
      outputPreview: "#outputPreview",
      outputSummary: "#outputSummary",
      resultList: "#resultList",
      adjuster: "#photoAdjuster"
    },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name),
    invalidTypeMessage: "Choose JPG, PNG or WebP images only.",
    maxFileMessage: "Each image must be 25 MB or smaller.",
    emptySummary: "No images selected",
    initialMessage: "Select one or more images. Everything is processed locally in your browser.",
    readyMessage: "Ready. Review the settings, then create your optimized file(s).",
    readErrorMessage: "One or more selected images could not be read by your browser.",
    onFilesSelected: async ({ files, state, el }) => {
      revokeUrls(state.previewUrls || []);
      revokeUrls(state.outputUrls || []);
      state.previewUrls = [];
      state.outputUrls = [];
      state.images = [];

      state.images = [];
      state.editorUrls = [];
      state.editorSources = [];
      state.cropSelections = [];
      state.activeIndex = 0;

      state.previewUrls = files.map(function (file) {
        return URL.createObjectURL(file);
      });

      if (state.previewUrls[0]) {
        renderPreview(state.previewUrls[0], el.inputPreview, files[0].name);
      }

      el.batchCount.textContent = files.length + " selected";
      el.batchSize.textContent = window.FreePDF.formatBytes(
        files.reduce((sum, file) => sum + file.size, 0)
      );
      el.outputSummary.textContent = "Not processed yet";
      el.resultList.textContent = "";

      if (framingIsActive(el)) {
        await showActiveEditor(files, state, el, 0);
      } else {
        el.adjuster.hidden = true;
      }
    },
    onReset: ({ state, el }) => {
      revokeUrls(state.previewUrls || []);
      revokeUrls(state.outputUrls || []);

      state.previewUrls = [];
      state.outputUrls = [];
      state.images = [];
      revokeUrls(state.editorUrls || []);
      state.editor?.destroy?.();
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
        width: Number(el.width.value || 1600),
        height: Number(el.height.value || 1200),
        unit: el.dimensionUnit.value,
        dpi: Number(el.dpi.value || 96),
        keepAspect: el.keepAspect.checked
      };
      const cropMode = el.cropMode.value;
      const background = el.background.value;
      const mime = el.outputFormat.value;
      const manualFraming = framingIsActive(el);

      if (manualFraming && !state.cropSelections[state.activeIndex || 0] && state.editor?.getCropRect) {
        state.cropSelections[state.activeIndex || 0] = state.editor.getCropRect();
      }

      revokeUrls(state.outputUrls || []);
      state.outputUrls = [];

      const results = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(
          "Optimizing " + (index + 1) + " of " + files.length + " — " + file.name,
          "info"
        );

        const cached = state.images.find(function (entry) {
          return entry.file === file;
        });
        const image = cached?.image || await loadImage(file);

        let cropSelection = state.cropSelections[index] || null;
        if (index === state.activeIndex && state.editor?.getCropRect) {
          cropSelection = state.editor.getCropRect() || cropSelection;
          if (cropSelection) state.cropSelections[index] = cropSelection;
        }

        const dimensions = resolveDimensions({
          ...baseOptions,
          sourceWidth: image.naturalWidth,
          sourceHeight: image.naturalHeight
        });

        const result = await encodeBestUnderTarget({
          image,
          dimensions,
          mime,
          targetBytes,
          cropMode: manualFraming ? "fill" : cropMode,
          background,
          cropRect: manualFraming ? cropSelection : null,
          setProgress,
          progressStart: (index / files.length) * 75,
          progressEnd: ((index + 1) / files.length) * 75
        });

        if (!result) throw new Error("encode-failed");

        await validateOutputPhoto(result.blob);

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
            "Optimized preview for " + file.name,
            { transparent: background === "keep" && mime !== "image/jpeg" }
          );
        }
      }

      for (const result of results) {
        downloadBlob(
          result.blob,
          safeBaseName(result.file.name) + "-optimized." + chooseExtension(mime)
        );
      }

      const targetMissed = results.some((result) => !result.reached);
      const transparentOutput = background === "keep" && mime !== "image/jpeg";

      el.outputSummary.textContent =
        results.length + " file" + (results.length === 1 ? "" : "s") +
        " optimized · target " + formatBytes(targetBytes) +
        (transparentOutput ? " · transparency preserved" : "") +
        (targetMissed ? " · closest safe result for one or more files" : " · target met");

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
          safeBaseName(result.file.name) + "-optimized." + chooseExtension(mime);
        link.textContent = "Download";

        row.appendChild(link);
        el.resultList.appendChild(row);
      }

      setProgress(100);
      setStatus(
        results.length > 1
          ? "Done — optimized " + results.length + " files. Individual downloads were started. Your browser may ask to allow multiple downloads."
          : "Done — optimized the image and started the download.",
        "success"
      );
    },
    onError: (error, { setStatus }) => {
      const message =
        error?.message === "encode-failed"
          ? "The browser could not encode one of the selected images. Try a smaller image or a different output format."
          : error?.message === "output-validation-failed"
            ? "The browser created an invalid image result. Try the same settings again or use a different output format."
            : "The selected images could not be optimized in your browser.";
      setStatus(message, "error");
    }
  });

  controller.mount();
  controller.el.dpi.hidden = controller.el.dimensionUnit.value === "px";
  controller.el.adjuster.hidden = true;

  function syncDimensionControls() {
    const mode = controller.el.dimensionMode.value;
    const framing = framingIsActive(controller.el);

    controller.el.dimensionFields.hidden = mode === "original";
    controller.el.dimensionUnit.disabled = mode === "original";
    controller.el.dpi.disabled = mode !== "exact" && mode !== "physical";
    controller.el.cropMode.disabled = mode !== "exact" || framing;

    if (framing) controller.el.cropMode.value = "fill";
    if (controller.ready && controller.files.length) {
      refreshEditorMode(controller);
    }
  }

  controller.el.targetSize.addEventListener("change", function () {
    controller.el.customTargetWrap.hidden = controller.el.targetSize.value !== "custom";
  });

  controller.el.dimensionMode.addEventListener("change", function () {
    syncDimensionControls();
  });

  controller.el.dimensionUnit.addEventListener("change", function () {
    controller.el.dpi.hidden = controller.el.dimensionUnit.value === "px";
    syncDimensionControls();
  });

  controller.el.keepAspect.addEventListener("change", function () {
    syncDimensionControls();
  });

  function syncFramingAspect() {
    if (!framingIsActive(controller.el) || !controller.state.editor) return;
    controller.state.editor.setAspectRatio(resolveCropAspect(
      controller.el,
      controller.state.editorSources?.[controller.state.activeIndex || 0]?.image ||
        { naturalWidth: Number(controller.el.width.value || 1600), naturalHeight: Number(controller.el.height.value || 1200) }
    ));
  }

  controller.el.width.addEventListener("input", function () {
    syncFramingAspect();
  });

  controller.el.height.addEventListener("input", function () {
    syncFramingAspect();
  });

  controller.el.cropMode.addEventListener("change", function () {
    if (framingIsActive(controller.el)) {
      controller.el.cropMode.value = "fill";
    }
  });

  syncDimensionControls();
}
