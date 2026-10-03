import { ToolController } from "../core/tool-controller.js";
import { createCanvas, findClosestBlob, loadImage, makeBlob } from "../core/image-tool-kit.js";

const MAX_FILE = 25 * window.FreePDF.MB;

export function mount() {
  const tool = new ToolController({
    selectors: {
      zone: "#dropZone",
      input: "#imageFile",
      summary: "#fileSummary",
      target: "#targetSize",
      width: "#maxWidth",
      format: "#outputFormat",
      action: "#compressButton",
      clear: "#clearButton",
      progress: "#progressBar",
      status: "#toolStatus",
      originalSize: "#originalSize",
      outputSize: "#outputSize",
      dimensions: "#dimensions"
    },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type),
    invalidTypeMessage: "Choose a JPG, PNG or WebP image.",
    maxFileMessage: "Keep the image below 25 MB for browser stability.",
    emptySummary: "No image selected",
    initialMessage: "Choose a JPG, PNG or WebP image. Processing stays in your browser.",
    readyMessage: "Ready. Choose a target size and export format.",
    readErrorMessage: "The image could not be read by your browser.",
    onFileSelected: async ({ file, state, el }) => {
      state.image = await loadImage(file);
      el.dimensions.textContent = state.image.naturalWidth + " × " + state.image.naturalHeight + " px";
      el.outputSize.textContent = "—";
    },
    onReset: ({ el }) => {
      el.outputSize.textContent = "—";
      el.dimensions.textContent = "—";
    },
    onProcess: async ({ file, state, el, setProgress, setStatus, formatBytes, safeBaseName, downloadBlob }) => {
      const targetBytes = Math.max(5, Number(el.target.value || 200)) * 1024;
      const maxWidth = Math.max(100, Number(el.width.value || 1600));
      const mime = el.format.value;

      setProgress(10);
      setStatus("Creating a browser-local optimized copy…", "info");

      const canvasFor = (width) => {
        const scale = Math.min(1, width / state.image.naturalWidth);
        const w = Math.max(1, Math.round(state.image.naturalWidth * scale));
        const h = Math.max(1, Math.round(state.image.naturalHeight * scale));
        const { canvas, ctx } = createCanvas(state.image, {
          width: w,
          height: h,
          alpha: mime === "image/png"
        });
        if (mime === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(state.image, 0, 0, w, h);
        return canvas;
      };

      let width = maxWidth;
      let blob;

      if (mime === "image/png") {
        blob = await makeBlob(canvasFor(width), mime);
      } else {
        blob = await findClosestBlob({
          mime,
          targetBytes,
          createCanvasForAttempt: async () => canvasFor(width)
        });
      }

      setProgress(65);

      let attempts = 0;
      while (blob && blob.size > targetBytes && width > 400 && attempts < 5 && mime !== "image/png") {
        width = Math.round(width * 0.82);
        blob = await findClosestBlob({
          mime,
          targetBytes,
          createCanvasForAttempt: async () => canvasFor(width)
        });
        attempts += 1;
        setProgress(65 + attempts * 6);
      }

      if (!blob) throw new Error("encode-failed");

      el.outputSize.textContent = formatBytes(blob.size);
      const reduction = file.size > 0 ? Math.max(0, ((file.size - blob.size) / file.size) * 100) : 0;
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

      downloadBlob(blob, safeBaseName(file.name) + "-compressed." + ext);
      setProgress(100);

      const targetMessage = blob.size <= targetBytes
        ? "Target met."
        : "The smallest browser result was above the target; no extreme quality loss was forced.";

      setStatus(
        "Done — " + formatBytes(file.size) + " → " + formatBytes(blob.size) +
        " (" + reduction.toFixed(1) + "% smaller). " + targetMessage,
        "success"
      );
    }
  });

  tool.mount();
}
