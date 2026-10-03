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

export function trimWhitespace(canvas, threshold = 245, padding = 8) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const visible = alpha > 8 && !(r >= threshold && g >= threshold && b >= threshold);
      if (!visible) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || maxY < 0) return canvas;

  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  const right = Math.min(canvas.width, maxX + padding + 1);
  const bottom = Math.min(canvas.height, maxY + padding + 1);
  const output = document.createElement("canvas");
  output.width = Math.max(1, right - x);
  output.height = Math.max(1, bottom - y);
  output.getContext("2d", { alpha: true }).drawImage(
    canvas,
    x, y, output.width, output.height,
    0, 0, output.width, output.height
  );
  return output;
}
