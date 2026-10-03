/**
 * Shared image algorithms for image-based tools.
 * Keep browser/file/image mechanics here; tool modules should only describe policy.
 */
export async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image-load-failed"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createCanvas(image, options = {}) {
  const width = Math.max(1, Math.round(options.width || image.naturalWidth));
  const height = Math.max(1, Math.round(options.height || image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: options.alpha !== false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }

  return { canvas, ctx };
}

export function drawContain(image, ctx, width, height) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const drawHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const x = Math.round((width - drawWidth) / 2);
  const y = Math.round((height - drawHeight) / 2);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

export function makeBlob(canvas, mime, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

export async function findClosestBlob({ createCanvasForAttempt, mime, targetBytes, minQuality = 0.1, maxQuality = 0.95, iterations = 9 }) {
  let best = null;
  let low = minQuality;
  let high = maxQuality;

  for (let i = 0; i < iterations; i += 1) {
    const quality = (low + high) / 2;
    const canvas = await createCanvasForAttempt();
    const blob = await makeBlob(canvas, mime, quality);
    if (!blob) throw new Error("encode-failed");

    if (!best || Math.abs(blob.size - targetBytes) < Math.abs(best.size - targetBytes)) {
      best = blob;
    }

    if (blob.size > targetBytes) high = quality;
    else low = quality;
  }

  return best;
}

export function removeNearWhite(canvas, threshold = 238) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i];
    const g = pixels.data[i + 1];
    const b = pixels.data[i + 2];
    if (r > threshold && g > threshold && b > threshold) pixels.data[i + 3] = 0;
  }
  ctx.putImageData(pixels, 0, 0);
}

export function drawCover(image, ctx, width, height, focusX = 0.5, focusY = 0.5) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const drawHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const overflowX = Math.max(0, drawWidth - width);
  const overflowY = Math.max(0, drawHeight - height);
  const safeFocusX = Math.max(0, Math.min(1, Number(focusX) || 0.5));
  const safeFocusY = Math.max(0, Math.min(1, Number(focusY) || 0.5));
  const x = Math.round(-overflowX * safeFocusX);
  const y = Math.round(-overflowY * safeFocusY);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}
