import { ToolController } from "../core/tool-controller.js";
import { createImageAdjuster } from "../core/image-adjuster.js";
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

function resolveDimensions(preset) {
  return {
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
}

function buildSmartPassportCrop(image, aspectRatio, focusY = 0.40) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const sourceRatio = sourceWidth / Math.max(1, sourceHeight);

  let width = sourceWidth;
  let height = sourceHeight;

  if (sourceRatio > aspectRatio) {
    height = sourceHeight;
    width = sourceHeight * aspectRatio;
  } else {
    width = sourceWidth;
    height = sourceWidth / aspectRatio;
  }

  const centerX = sourceWidth / 2;
  const desiredCenterY = sourceHeight * focusY;
  const minCenterY = height / 2;
  const maxCenterY = sourceHeight - height / 2;
  const centerY = Math.min(maxCenterY, Math.max(minCenterY, desiredCenterY));

  return {
    x: Math.max(0, centerX - width / 2),
    y: Math.max(0, centerY - height / 2),
    width,
    height
  };
}

function sourceForFile(file, image, url, preset) {
  const dimensions = resolveDimensions(preset);
  const aspectRatio = dimensions.width / dimensions.height;
  return {
    file,
    image,
    url,
    width: image.naturalWidth,
    height: image.naturalHeight,
    suggestedCrop: buildSmartPassportCrop(image, aspectRatio)
  };
}

export function mount() {
  async function showActiveEditor(files, state, el, index, resetCrop = false) {
    state.activeIndex = Math.max(0, Math.min(index, files.length - 1));
    const file = files[state.activeIndex];

    if (!state.images) state.images = [];
    let cached = state.images.find((entry) => entry.file === file);
    if (!cached) {
      cached = { file, image: await loadImage(file) };
      state.images.push(cached);
    }

    const preset = resolvePreset(el);
    const source = sourceForFile(
      file,
      cached.image,
      state.previewUrls[state.activeIndex],
      preset
    );
    state.editorSources[state.activeIndex] = source;

    if (resetCrop) {
      state.cropSelections[state.activeIndex] = null;
    }

    const savedCrop = state.cropSelections[state.activeIndex] || source.suggestedCrop;
    el.passportAdjuster.hidden = false;

    if (!state.editor) {
      state.editor = createImageAdjuster({
        container: el.passportAdjuster,
        aspectRatio: source.width / source.height,
        label: "Passport photo framing",
        instructions: "Drag to move · pinch or wheel to zoom. Keep the full head, chin and shoulders inside the guide.",
        guideType: "passport"
      });
      state.editor.setOnChange((crop) => {
        state.cropSelections[state.activeIndex] = crop;
      });
    }

    state.editor.setAspectRatio(source.suggestedCrop.width / source.suggestedCrop.height);
    state.editor.setSource(source, source.suggestedCrop, savedCrop);
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
      state.previewUrls = files.map((file) => URL.createObjectURL(file));
      state.outputUrls = [];
      state.images = [];
      state.editorSources = [];
      state.cropSelections = [];
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
      state.previewUrls = [];
      state.outputUrls = [];
      state.images = [];
      state.editorSources = [];
      state.cropSelections = [];
      state.editor?.destroy?.();
      state.editor = null;
      state.activeIndex = 0;

      el.passportAdjuster.textContent = "";
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

        const dimensions = resolveDimensions(preset);

        const result = await encodeBestUnderTarget({
          image,
          dimensions,
          mime,
          targetBytes,
          cropMode: "fill",
          background: "white",
          cropRect: state.cropSelections[index] || buildSmartPassportCrop(
            image,
            dimensions.width / dimensions.height
          ),
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

  controller.el.preset.addEventListener("change", async () => {
    updatePresetControls(controller.el);
    if (controller.ready && controller.files.length) {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  });

  controller.el.targetSize.addEventListener("change", () => {
    controller.el.customTargetWrap.hidden = controller.el.targetSize.value !== "custom";
  });

  controller.el.width.addEventListener("input", async () => {
    if (controller.ready && controller.files.length && controller.el.preset.value === "custom") {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  });
  controller.el.height.addEventListener("input", async () => {
    if (controller.ready && controller.files.length && controller.el.preset.value === "custom") {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  });
  controller.el.unit.addEventListener("change", async () => {
    if (controller.ready && controller.files.length && controller.el.preset.value === "custom") {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  });
  controller.el.dpi.addEventListener("change", async () => {
    if (controller.ready && controller.files.length && controller.el.preset.value === "custom") {
      await showActiveEditor(controller.files, controller.state, controller.el, controller.state.activeIndex || 0, true);
    }
  });

  updatePresetControls(controller.el);
}
