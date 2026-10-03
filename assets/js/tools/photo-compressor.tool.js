import { ToolController } from "../core/tool-controller.js";
import { drawContain, drawCover, createCanvas, loadImage, makeBlob } from "../core/image-tool-kit.js";
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

async function encodeAtQuality({ image, width, height, mime, quality, cropMode, background }) {
  const alpha = mime !== "image/jpeg" && background !== "white";
  const result = createCanvas(image, { width, height, alpha });
  const ctx = result.ctx;

  if (background === "white" || mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  if (cropMode === "fill") drawCover(image, ctx, width, height);
  else drawContain(image, ctx, width, height);

  return makeBlob(result.canvas, mime, mime === "image/png" ? undefined : quality);
}

async function encodeBestUnderTarget({
  image,
  dimensions,
  mime,
  targetBytes,
  cropMode,
  background,
  setProgress,
  progressStart,
  progressEnd
}) {
  let best = null;

  for (let widthIndex = 0; widthIndex < WIDTH_LADDER.length; widthIndex += 1) {
    const factor = WIDTH_LADDER[widthIndex];
    const width = clampPixels(dimensions.width * factor, dimensions.width);
    const height = clampPixels(dimensions.height * factor, dimensions.height);

    if (mime === "image/png") {
      const blob = await encodeAtQuality({
        image, width, height, mime, quality: 1, cropMode, background
      });
      if (!best || blob.size < best.blob.size) {
        best = { blob, width, height, quality: null };
      }
      if (isTargetReached(blob.size, targetBytes)) return { ...best, reached: true };
      setProgress(progressStart + ((widthIndex + 1) / WIDTH_LADDER.length) * (progressEnd - progressStart));
      continue;
    }

    let low = 0.20;
    let high = 0.95;
    let bestUnder = null;
    let bestAny = null;

    for (const quality of QUALITY_LADDER) {
      const blob = await encodeAtQuality({
        image, width, height, mime, quality, cropMode, background
      });

      if (!bestAny || blob.size < bestAny.blob.size) {
        bestAny = { blob, width, height, quality };
      }

      if (blob.size <= targetBytes) {
        if (!bestUnder || quality > bestUnder.quality) {
          bestUnder = { blob, width, height, quality };
        }
        low = Math.max(low, quality);
      } else {
        high = Math.min(high, quality);
      }
    }

    for (let iteration = 0; iteration < 5 && low < high; iteration += 1) {
      const quality = (low + high) / 2;
      const blob = await encodeAtQuality({
        image, width, height, mime, quality, cropMode, background
      });

      if (!bestAny || blob.size < bestAny.blob.size) {
        bestAny = { blob, width, height, quality };
      }

      if (blob.size <= targetBytes) {
        if (!bestUnder || quality > bestUnder.quality) {
          bestUnder = { blob, width, height, quality };
        }
        low = quality;
      } else {
        high = quality;
      }
    }

    const candidate = bestUnder || bestAny;
    if (candidate && (!best || Math.abs(candidate.blob.size - targetBytes) < Math.abs(best.blob.size - targetBytes))) {
      best = candidate;
    }

    if (bestUnder) return { ...bestUnder, reached: true };

    setProgress(progressStart + ((widthIndex + 1) / WIDTH_LADDER.length) * (progressEnd - progressStart));
  }

  return best ? { ...best, reached: false } : null;
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
      originalSize: "#originalSize"
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
      if (state.archiveUrl) URL.revokeObjectURL(state.archiveUrl);

      state.previewUrls = [];
      state.outputUrls = [];
      state.images = [];
      state.archiveUrl = null;

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
      if (state.archiveUrl) URL.revokeObjectURL(state.archiveUrl);
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

      if (results.length > 1) {
        if (!window.JSZip) throw new Error("zip-engine-not-loaded");

        setStatus("Packaging the optimized images into a ZIP…", "info");
        setProgress(90);

        const zip = new window.JSZip();
        for (const result of results) {
          zip.file(
            safeBaseName(result.file.name) + "-optimized." + chooseExtension(mime),
            result.blob
          );
        }

        const archive = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 }
        });
        state.archiveUrl = URL.createObjectURL(archive);
        downloadBlob(archive, "freepdf-optimized-images.zip");
      } else {
        const result = results[0];
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
          ? "Done — optimized " + results.length + " images and started the ZIP download."
          : "Done — optimized the image and started the download.",
        "success"
      );
    },
    onError: (error, { setStatus }) => {
      const message =
        error?.message === "zip-engine-not-loaded"
          ? "Batch ZIP support could not be loaded. Refresh the page and try again."
          : error?.message === "encode-failed"
            ? "The browser could not encode one of the selected images. Try a smaller image or a different output format."
            : "The selected images could not be optimized in your browser.";
      setStatus(message, "error");
    }
  });

  controller.mount();

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
