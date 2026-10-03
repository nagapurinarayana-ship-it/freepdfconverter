const KB = 1024;

export const TARGET_PRESETS = Object.freeze([
  Object.freeze({ bytes: 100 * KB, label: "100 KB" }),
  Object.freeze({ bytes: 200 * KB, label: "200 KB" }),
  Object.freeze({ bytes: 500 * KB, label: "500 KB" }),
  Object.freeze({ bytes: 1024 * KB, label: "1 MB" }),
  Object.freeze({ bytes: 2048 * KB, label: "2 MB" })
]);

export const CUSTOM_TARGET_KB = Object.freeze({ min: 50, max: 50000 });

// Quality-first to size-first. The bounded matrix avoids unbounded quality degradation.
export const TARGET_CANDIDATES = Object.freeze([
  Object.freeze({ scale: 1.20, quality: 0.82 }),
  Object.freeze({ scale: 1.10, quality: 0.78 }),
  Object.freeze({ scale: 1.00, quality: 0.72 }),
  Object.freeze({ scale: 0.92, quality: 0.68 }),
  Object.freeze({ scale: 0.86, quality: 0.64 }),
  Object.freeze({ scale: 0.78, quality: 0.60 }),
  Object.freeze({ scale: 0.72, quality: 0.56 }),
  Object.freeze({ scale: 0.66, quality: 0.52 }),
  Object.freeze({ scale: 0.60, quality: 0.48 }),
  Object.freeze({ scale: 0.55, quality: 0.44 }),
  Object.freeze({ scale: 0.50, quality: 0.40 }),
  Object.freeze({ scale: 0.42, quality: 0.34 })
]);

export function clampCustomTargetKb(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 200;
  return Math.max(CUSTOM_TARGET_KB.min, Math.min(CUSTOM_TARGET_KB.max, Math.round(numeric)));
}

export function targetBytesFromSelection(value, customKb) {
  if (value === "custom") return clampCustomTargetKb(customKb) * KB;
  const bytes = Number(value);
  return Number.isFinite(bytes) && bytes > 0 ? Math.round(bytes) : 200 * KB;
}

export function isTargetReached(outputBytes, targetBytes) {
  return Number.isFinite(outputBytes) && Number.isFinite(targetBytes) && outputBytes <= targetBytes;
}

export function reductionPercent(inputBytes, outputBytes) {
  if (!Number.isFinite(inputBytes) || inputBytes <= 0 || !Number.isFinite(outputBytes)) return 0;
  return Math.max(0, ((inputBytes - outputBytes) / inputBytes) * 100);
}

export function chooseBestCandidate(candidates) {
  return (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => candidate && Number.isFinite(candidate.size))
    .sort((a, b) => a.size - b.size)[0] || null;
}
