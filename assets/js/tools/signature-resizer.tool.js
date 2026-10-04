import { ToolController } from "../core/tool-controller.js";
import { createCanvas, loadImage, makeBlob, removeNearWhite, trimWhitespace } from "../core/image-tool-kit.js";
import { encodeBestUnderTarget } from "../core/image-form-engine.js";
import { reductionPercent, resolveDimensions, chooseExtension, targetBytesFromSelection } from "../core/image-form-policy.js";

const MB = window.FreePDF.MB;
const MAX_FILE = 15 * MB;
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 100 * MB;

function revokeUrls(urls = []) { for (const url of urls) URL.revokeObjectURL(url); urls.length = 0; }
function escapeText(value) { return String(value).replace(/[&<>"]/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]; }); }
async function canvasToImage(canvas) {
  const blob = await makeBlob(canvas, "image/png");
  if (!blob) throw new Error("encode-failed");
  const url = URL.createObjectURL(blob);
  try { return await new Promise((resolve, reject) => { const image = new Image(); image.onload = function () { resolve(image); }; image.onerror = function () { reject(new Error("image-load-failed")); }; image.src = url; }); }
  finally { URL.revokeObjectURL(url); }
}
async function prepareSignatureSource(image, autoTrim, removeBackground) {
  const { canvas, ctx } = createCanvas(image, { width: image.naturalWidth, height: image.naturalHeight, alpha: true });
  ctx.drawImage(image, 0, 0);
  if (removeBackground) removeNearWhite(canvas);
  return autoTrim ? trimWhitespace(canvas, removeBackground ? 245 : 250, 10) : canvas;
}
function renderPreview(url, container, label) {
  container.textContent = "";
  const figure = document.createElement("figure"); figure.className = "image-preview-card";
  const image = document.createElement("img"); image.alt = label; image.loading = "lazy"; image.src = url;
  figure.appendChild(image); container.appendChild(figure);
}

export function mount() {
  const controller = new ToolController({
    multiple: true, maxFiles: MAX_FILES, maxTotalFileBytes: MAX_TOTAL_BYTES,
    maxTotalFileMessage: "Keep the batch below 100 MB for reliable browser processing.",
    selectors: { zone: "#dropZone", input: "#signatureFile", summary: "#fileSummary", action: "#processButton", clear: "#clearButton", progress: "#progressBar", status: "#toolStatus", originalSize: "#originalSize", targetSize: "#targetSize", customTargetWrap: "#customTargetWrap", customTarget: "#customTarget", width: "#signatureWidth", height: "#signatureHeight", dimensionMode: "#dimensionMode", dimensionUnit: "#dimensionUnit", dpi: "#dpi", keepAspect: "#keepAspect", autoTrim: "#autoTrim", background: "#backgroundMode", format: "#outputFormat", inputPreview: "#inputPreview", outputPreview: "#outputPreview", outputSummary: "#outputSummary", resultList: "#resultList", batchCount: "#batchCount", batchSize: "#batchSize" },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name),
    invalidTypeMessage: "Choose JPG, PNG or WebP signature images only.",
    maxFileMessage: "Each signature image must be 15 MB or smaller.",
    emptySummary: "No signatures selected", initialMessage: "Select one or more signature images. Processing stays in your browser.",
    readyMessage: "Ready. Review the dimensions, background and target size, then prepare the signature file(s).",
    readErrorMessage: "One or more signature images could not be read by your browser.",
    onFilesSelected: ({ files, state, el }) => {
      revokeUrls(state.previewUrls || []); revokeUrls(state.outputUrls || []); state.previewUrls = files.map((file) => URL.createObjectURL(file)); state.outputUrls = []; state.images = [];
      if (state.previewUrls[0]) renderPreview(state.previewUrls[0], el.inputPreview, files[0].name);
      el.batchCount.textContent = files.length + " selected"; el.batchSize.textContent = window.FreePDF.formatBytes(files.reduce((sum, file) => sum + file.size, 0)); el.outputSummary.textContent = "Not processed yet"; el.resultList.textContent = "";
    },
    onReset: ({ state, el }) => {
      revokeUrls(state.previewUrls || []); revokeUrls(state.outputUrls || []); state.previewUrls = []; state.outputUrls = []; state.images = [];
      el.batchCount.textContent = "0 selected"; el.batchSize.textContent = "0 B"; el.outputSummary.textContent = "Not processed yet"; el.resultList.textContent = ""; el.inputPreview.textContent = ""; el.outputPreview.textContent = ""; el.customTargetWrap.hidden = true;
    },
    onProcess: async ({ files, state, el, setProgress, setStatus, formatBytes, safeBaseName, downloadBlob }) => {
      const targetBytes = targetBytesFromSelection(el.targetSize.value, el.customTarget.value);
      const baseOptions = { mode: el.dimensionMode.value, width: Number(el.width.value || 600), height: Number(el.height.value || 200), unit: el.dimensionUnit.value, dpi: Number(el.dpi.value || 96), keepAspect: el.keepAspect.checked };
      const autoTrim = el.autoTrim.checked; const transparent = el.background.value === "transparent"; const background = transparent ? "keep" : "white"; const mime = el.format.value; const results = [];
      revokeUrls(state.outputUrls || []); state.outputUrls = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]; setStatus("Preparing " + (index + 1) + " of " + files.length + " — " + file.name, "info");
        const cached = state.images.find((entry) => entry.file === file); const originalImage = cached?.image || await loadImage(file);
        const preparedCanvas = await prepareSignatureSource(originalImage, autoTrim, transparent); const preparedImage = await canvasToImage(preparedCanvas);
        const dimensions = resolveDimensions({ ...baseOptions, sourceWidth: preparedImage.naturalWidth, sourceHeight: preparedImage.naturalHeight });
        const preserveDimensions = baseOptions.mode === "exact" || baseOptions.mode === "physical" || baseOptions.mode === "original";
        const result = await encodeBestUnderTarget({ image: preparedImage, dimensions, mime, targetBytes, preserveDimensions, cropMode: el.dimensionMode.value === "exact" && !el.keepAspect.checked ? "fill" : "contain", background, setProgress, progressStart: (index / files.length) * 75, progressEnd: ((index + 1) / files.length) * 75 });
        if (!result) throw new Error("encode-failed");
        const outputUrl = URL.createObjectURL(result.blob); state.outputUrls.push(outputUrl);
        results.push({ file, blob: result.blob, url: outputUrl, width: result.width, height: result.height, reached: result.reached, reduction: reductionPercent(file.size, result.blob.size) });
        if (index === 0) renderPreview(outputUrl, el.outputPreview, "Prepared signature preview for " + file.name);
      }
      for (const result of results) downloadBlob(result.blob, safeBaseName(result.file.name) + "-signature." + chooseExtension(mime));
      el.outputSummary.textContent = results.length + " file" + (results.length === 1 ? "" : "s") + " prepared · target " + formatBytes(targetBytes);
      el.resultList.textContent = "";
      for (const result of results) {
        const row = document.createElement("div"); row.className = "result-row";
        row.innerHTML = "<strong>" + escapeText(result.file.name) + "</strong><span>" + formatBytes(result.file.size) + " → " + formatBytes(result.blob.size) + " · " + result.width + "×" + result.height + " px · " + result.reduction.toFixed(1) + "% smaller" + (result.reached ? " · target met" : " · required dimensions preserved; target could not be met without reducing dimensions") + "</span>";
        const link = document.createElement("a"); link.href = result.url; link.download = safeBaseName(result.file.name) + "-signature." + chooseExtension(mime); link.textContent = "Download"; row.appendChild(link); el.resultList.appendChild(row);
      }
      setProgress(100); setStatus(results.length > 1 ? "Done — prepared " + results.length + " files. Individual downloads were started. Your browser may ask to allow multiple downloads." : "Done — prepared the signature and started the download.", "success");
    },
    onError: (error, { setStatus }) => setStatus(error?.message === "encode-failed" ? "The browser could not encode the signature. Try a larger target or a different output format." : "The selected signature images could not be prepared in your browser.", "error")
  });

  const updateDpiState = () => { const usesPhysicalUnits = controller.el.dimensionUnit.value === "mm" || controller.el.dimensionUnit.value === "cm"; controller.el.dpi.hidden = !usesPhysicalUnits; controller.el.dpi.disabled = controller.el.dimensionMode.value === "original" || !usesPhysicalUnits; };
  const syncBackgroundOption = () => { const transparentOption = Array.from(controller.el.background.options).find((option) => option.value === "transparent"); const supportsAlpha = controller.el.format.value !== "image/jpeg"; if (transparentOption) transparentOption.disabled = !supportsAlpha; if (!supportsAlpha && controller.el.background.value === "transparent") controller.el.background.value = "white"; };
  controller.mount(); updateDpiState(); syncBackgroundOption();
  controller.el.targetSize.addEventListener("change", () => { controller.el.customTargetWrap.hidden = controller.el.targetSize.value !== "custom"; });
  controller.el.dimensionMode.addEventListener("change", () => { controller.el.dimensionUnit.disabled = controller.el.dimensionMode.value === "original"; updateDpiState(); });
  controller.el.dimensionUnit.addEventListener("change", () => updateDpiState()); controller.el.format.addEventListener("change", () => syncBackgroundOption());
}
