import { clampPixels, isTargetReached, QUALITY_LADDER, WIDTH_LADDER } from "./image-form-policy.js";
import { createCanvas, drawContain, drawCover, makeBlob } from "./image-tool-kit.js";

export async function encodeImageAtQuality({ image, width, height, mime, quality, cropMode, background }) {
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

export async function encodeBestUnderTarget({
  image,
  dimensions,
  mime,
  targetBytes,
  cropMode,
  background,
  setProgress = () => {},
  progressStart = 0,
  progressEnd = 100
}) {
  let best = null;

  for (let widthIndex = 0; widthIndex < WIDTH_LADDER.length; widthIndex += 1) {
    const factor = WIDTH_LADDER[widthIndex];
    const width = clampPixels(dimensions.width * factor, dimensions.width);
    const height = clampPixels(dimensions.height * factor, dimensions.height);

    if (mime === "image/png") {
      const blob = await encodeImageAtQuality({
        image, width, height, mime, quality: 1, cropMode, background
      });

      if (!best || blob.size < best.blob.size) {
        best = { blob, width, height, quality: null };
      }

      if (isTargetReached(blob.size, targetBytes)) {
        return { ...best, reached: true };
      }

      setProgress(
        progressStart + ((widthIndex + 1) / WIDTH_LADDER.length) * (progressEnd - progressStart)
      );
      continue;
    }

    let low = 0.20;
    let high = 0.95;
    let bestUnder = null;
    let bestAny = null;

    for (const quality of QUALITY_LADDER) {
      const blob = await encodeImageAtQuality({
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
      const blob = await encodeImageAtQuality({
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

    setProgress(
      progressStart + ((widthIndex + 1) / WIDTH_LADDER.length) * (progressEnd - progressStart)
    );
  }

  return best ? { ...best, reached: false } : null;
}
