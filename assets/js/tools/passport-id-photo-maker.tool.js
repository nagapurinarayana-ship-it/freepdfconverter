import { ToolController } from "../core/tool-controller.js";
import { loadImage } from "../core/image-tool-kit.js";
import { encodeBestUnderTarget } from "../core/image-form-engine.js";
import {
  chooseExtension,
  reductionPercent,
  targetBytesFromSelection,
  isTargetReached
} from "../core/image-form-policy.js";

const MB = window.FreePDF.MB;
const MAX_FILE = 20 * MB;
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 100 * MB;

const PRESETS = Object.freeze({
  "35x45": { width: 35, height: 45, unit: "mm", dpi: 300, label: "35 × 45 mm" },
  "2x2": { width: 51, height: 51, unit: "mm", dpi: 300, label: "2 × 2 in / 51 × 51 mm" },
  "35x35": { width: 35, height: 35, unit: "mm", dpi: 300, label: "35 × 35 mm" }
});

function revokeUrls(urls = []) {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.length = 0;
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

function escapeText(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  })[char]);
}

function resolvePreset(el) {
  if (el.preset.value === "custom") {
    return {
      width: Number(el.width.value || 35),
      height: Number(el.height.value || 45),
      unit: el.unit.value,
      dpi: Number(el.dpi.value || 300),
      label: "Custom size"
    };
  }
  return PRESETS[el.preset.value] || PRESETS["35x45"];
}

function updatePresetControls(el) {
  const custom = el.preset.value === "custom";
  el.customFields.hidden = !custom;
  el.dpiNote.textContent = custom
    ? "For physical dimensions, DPI determines the exported pixel dimensions."
    : "Preset uses 300 DPI to create a print-friendly pixel size. Always check the destination's current requirements.";
}

export function mount() {
  const controller = new ToolController({
    multiple: true,
    maxFiles: MAX_FILES,
    maxTotalFileBytes: MAX_TOTAL_BYTES,
    maxTotalFileMessage: "Keep the batch below 100 MB for reliable browser processing.",
    selectors: {
      zone: "#dropZone",
      input: "#photoFile",
      summary: "#fileSummary",
      action: "#createButton",
      clear: "#clearButton",
      progress: "#progressBar",
      status: "#toolStatus",
      originalSize: "#originalSize",
      preset: "#preset",
      customFields: "#customFields",
      width: "#photoWidth",
      height: "#photoHeight",
      unit: "#photoUnit",
      dpi: "#photoDpi",
      dpiNote: "#dpiNote",
      targetSize: "#targetSize",
      customTargetWrap: "#customTargetWrap",
      customTarget: "#customTarget",
      focusY: "#focusY",
      focusValue: "#focusValue",
      inputPreview: "#inputPreview",
      outputPreview: "#outputPreview",
      outputSummary: "#outputSummary",
      resultList: "#resultList",
      batchCount: "#batchCount",
      batchSize: "#batchSize"
    },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name),
    invalidTypeMessage: "Choose JPG, PNG or WebP images only.",
    maxFileMessage: "Each source image must be 20 MB or smaller.",
    emptySummary: "No photos selected",
    initialMessage: "Choose a photo. Processing stays on your device.",
    readyMessage: "Ready. Choose the required photo size and framing, then create the image file(s).",
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
      state.previewUrls = loaded.map((entry) => URL.createObjectURL(entry.file));

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
      updatePresetControls(el);
    },
    onProcess: async ({
      files, state, el, setProgress, setStatus, formatBytes, safeBaseName, downloadBlob
    }) => {
      const preset = resolvePreset(el);
      const targetBytes = targetBytesFromSelection(el.targetSize.value, el.customTarget.value);
      const focusY = Number(el.focusY.value) / 100;
      const mime = "image/jpeg";
      const outputExtension = chooseExtension(mime);

      revokeUrls(state.outputUrls || []);
      state.outputUrls = [];

      const results = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(
          "Preparing " + (index + 1) + " of " + files.length + " — " + file.name,
          "info"
        );

        const cached = state.images.find((entry) => entry.file === file);
        const image = cached?.image || await loadImage(file);

        const dimensions = {
          width: Math.max(32, Math.round(
            preset.unit === "mm"
              ? (preset.width / 25.4) * preset.dpi
              : preset.unit === "cm"
                ? (preset.width / 2.54) * preset.dpi
                : preset.width
          )),
          height: Math.max(32, Math.round(
            preset.unit === "mm"
              ? (preset.height / 25.4) * preset.dpi
              : preset.unit === "cm"
                ? (preset.height / 2.54) * preset.dpi
                : preset.height
          ))
        };

        const result = await encodeBestUnderTarget({
          image,
          dimensions,
          mime,
          targetBytes,
          cropMode: "fill",
          background: "white",
          cropFocusX: 0.5,
          cropFocusY: focusY,
          setProgress,
          progressStart: (index / files.length) * 80,
          progressEnd: ((index + 1) / files.length) * 80
        });

        if (!result) throw new Error("encode-failed");

        const url = URL.createObjectURL(result.blob);
        state.outputUrls.push(url);
        results.push({
          file,
          blob: result.blob,
          url,
          width: result.width,
          height: result.height,
          reached: isTargetReached(result.blob.size, targetBytes),
          reduction: reductionPercent(file.size, result.blob.size)
        });

        if (index === 0) {
          renderPreview(url, el.outputPreview, "Prepared ID photo preview for " + file.name);
        }
      }

      for (const result of results) {
        downloadBlob(
          result.blob,
          safeBaseName(result.file.name) + "-id-photo." + outputExtension
        );
      }

      el.outputSummary.textContent =
        results.length + " file" + (results.length === 1 ? "" : "s") +
        " created at " + preset.label + " · " + formatBytes(targetBytes) + " maximum";

      el.resultList.textContent = "";
      for (const result of results) {
        const row = document.createElement("div");
        row.className = "result-row";
        row.innerHTML =
          "<strong>" + escapeText(result.file.name) + "</strong>" +
          "<span>" + formatBytes(result.blob.size) + " · " +
          result.width + "×" + result.height + " px · " +
          result.reduction.toFixed(1) + "% smaller" +
          (result.reached ? " · target met" : " · closest safe result") +
          "</span>";

        const link = document.createElement("a");
        link.href = result.url;
        link.download = safeBaseName(result.file.name) + "-id-photo." + outputExtension;
        link.textContent = "Download";
        row.appendChild(link);
        el.resultList.appendChild(row);
      }

      setProgress(100);
      setStatus(
        results.length > 1
          ? "Done — created " + results.length + " ID photos. Individual downloads were started. Your browser may ask to allow multiple downloads."
          : "Done — ID photo created and direct download started.",
        "success"
      );
    },
    onError: (error, { setStatus }) => {
      setStatus(
        error?.message === "encode-failed"
          ? "The browser could not encode the photo. Try a larger target size."
          : "The selected photo could not be prepared in your browser.",
        "error"
      );
    }
  });

  controller.mount();

  controller.el.preset.addEventListener("change", () => updatePresetControls(controller.el));
  controller.el.focusY.addEventListener("input", () => {
    controller.el.focusValue.textContent = controller.el.focusY.value + "%";
  });
  controller.el.targetSize.addEventListener("change", () => {
    controller.el.customTargetWrap.hidden = controller.el.targetSize.value !== "custom";
  });
  updatePresetControls(controller.el);
}
