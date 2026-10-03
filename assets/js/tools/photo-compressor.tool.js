import { ToolController } from "../core/tool-controller.js";
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
      resultList: "#resultList"
    },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type),
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

      const loaded = [];
      for (const file of files.slice(0, 4)) {
        loaded.push({ file, image: await loadImage(file) });
      }

      state.images = loaded;
      state.previewUrls = loaded.map(function (entry) {
        return URL.createObjectURL(entry.file);
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
    },
    onReset: ({ state, el }) => {
      revokeUrls(state.previewUrls || []);
      revokeUrls(state.outputUrls || []);

      state.previewUrls = [];
      state.outputUrls = [];
      state.images = [];

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

      revokeUrls(state.outputUrls || []);
      state.outputUrls = [];
      state.archiveUrl = null;

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
          cropMode,
          background,
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
          renderPreview(outputUrl, el.outputPreview, "Optimized preview for " + file.name);
        }
      }

      for (const result of results) {
        downloadBlob(
          result.blob,
          safeBaseName(result.file.name) + "-optimized." + chooseExtension(mime)
        );
      }

      el.outputSummary.textContent =
        results.length + " file" + (results.length === 1 ? "" : "s") +
        " optimized · target " + formatBytes(targetBytes);

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
        error?.message === "zip-engine-not-loaded"
error?.message === "encode-failed"
            ? "The browser could not encode one of the selected images. Try a smaller image or a different output format."
            : "The selected images could not be optimized in your browser.";
      setStatus(message, "error");
    }
  });

  controller.mount();
  controller.el.dpi.hidden = controller.el.dimensionUnit.value === "px";

  controller.el.targetSize.addEventListener("change", function () {
    controller.el.customTargetWrap.hidden = controller.el.targetSize.value !== "custom";
  });

  controller.el.dimensionMode.addEventListener("change", function () {
    const mode = controller.el.dimensionMode.value;
    controller.el.dimensionFields.hidden = mode === "original";
    controller.el.dimensionUnit.disabled = mode === "original";
    controller.el.dpi.disabled = mode !== "exact" && mode !== "physical";
    controller.el.cropMode.disabled = mode !== "exact";
    if (mode !== "exact") controller.el.keepAspect.checked = true;
  });

  controller.el.dimensionUnit.addEventListener("change", function () {
    controller.el.dpi.hidden = controller.el.dimensionUnit.value === "px";
  });
}
