const KB = 1024;
const INCH_MM = 25.4;

export const PHOTO_TARGET_PRESETS = Object.freeze([
  Object.freeze({ value: "10", bytes: 10 * KB, label: "10 KB" }),
  Object.freeze({ value: "20", bytes: 20 * KB, label: "20 KB" }),
  Object.freeze({ value: "50", bytes: 50 * KB, label: "50 KB" }),
  Object.freeze({ value: "100", bytes: 100 * KB, label: "100 KB" }),
  Object.freeze({ value: "200", bytes: 200 * KB, label: "200 KB" }),
  Object.freeze({ value: "500", bytes: 500 * KB, label: "500 KB" }),
  Object.freeze({ value: "1024", bytes: 1024 * KB, label: "1 MB" }),
  Object.freeze({ value: "2048", bytes: 2048 * KB, label: "2 MB" })
]);

export const CUSTOM_TARGET_KB = Object.freeze({ min: 10, max: 50000 });
export const DIMENSION_LIMITS = Object.freeze({ minPx: 32, maxPx: 6000, maxDpi: 600 });

export const QUALITY_LADDER = Object.freeze([
  0.92, 0.86, 0.80, 0.74, 0.68, 0.62, 0.56, 0.50, 0.44, 0.38, 0.32
]);

export const WIDTH_LADDER = Object.freeze([
  1.00, 0.92, 0.84, 0.76, 0.68, 0.60, 0.52, 0.46
]);

export function clampTargetKb(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.max(CUSTOM_TARGET_KB.min, Math.min(CUSTOM_TARGET_KB.max, Math.round(numeric)));
}

export function targetBytesFromSelection(value, customKb) {
  if (value === "custom") return clampTargetKb(customKb) * KB;

  const numeric = Number(value);
  // The UI values are expressed in KB, including 1024 = 1 MB and 2048 = 2 MB.
  // Convert the selected KB value to bytes before handing it to the encoder.
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * KB) : 100 * KB;
}

export function reductionPercent(inputBytes, outputBytes) {
  if (!Number.isFinite(inputBytes) || inputBytes <= 0 || !Number.isFinite(outputBytes)) return 0;
  return Math.max(0, ((inputBytes - outputBytes) / inputBytes) * 100);
}

export function isTargetReached(outputBytes, targetBytes) {
  return Number.isFinite(outputBytes) && Number.isFinite(targetBytes) && outputBytes <= targetBytes;
}

export function pixelsFromPhysical(value, unit, dpi) {
  const numeric = Number(value);
  const safeDpi = Math.max(1, Math.min(DIMENSION_LIMITS.maxDpi, Number(dpi) || 96));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (unit === "cm") return Math.round((numeric / 2.54) * safeDpi);
  if (unit === "mm") return Math.round((numeric / INCH_MM) * safeDpi);
  return Math.round(numeric);
}

export function clampPixels(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(DIMENSION_LIMITS.minPx, Math.min(DIMENSION_LIMITS.maxPx, Math.round(numeric)));
}

export function resolveDimensions({ mode, width, height, unit, dpi, sourceWidth, sourceHeight, keepAspect }) {
  const sourceRatio = sourceWidth / Math.max(1, sourceHeight);
  if (mode === "original") {
    return { width: sourceWidth, height: sourceHeight };
  }

  if (mode === "max-width") {
    const maxWidth = clampPixels(pixelsFromPhysical(width, unit, dpi), sourceWidth);
    if (maxWidth >= sourceWidth) return { width: sourceWidth, height: sourceHeight };
    return {
      width: maxWidth,
      height: Math.max(DIMENSION_LIMITS.minPx, Math.round(maxWidth / sourceRatio))
    };
  }

  let resolvedWidth = clampPixels(pixelsFromPhysical(width, unit, dpi), sourceWidth);
  let resolvedHeight = clampPixels(pixelsFromPhysical(height, unit, dpi), sourceHeight);

  if (keepAspect) {
    const widthScale = resolvedWidth / sourceWidth;
    const heightScale = resolvedHeight / sourceHeight;
    const scale = Math.min(widthScale, heightScale);
    resolvedWidth = clampPixels(sourceWidth * scale, resolvedWidth);
    resolvedHeight = clampPixels(sourceHeight * scale, resolvedHeight);
  }

  return { width: resolvedWidth, height: resolvedHeight };
}

export function chooseExtension(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}
