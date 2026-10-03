import { ToolController } from "../core/tool-controller.js";
import { createCanvas, drawContain, findClosestBlob, loadImage, makeBlob, removeNearWhite } from "../core/image-tool-kit.js";

const MAX_FILE = 15 * window.FreePDF.MB;

export function mount() {
  const tool = new ToolController({
    selectors: {
      zone: "#dropZone",
      input: "#signatureFile",
      summary: "#fileSummary",
      width: "#signatureWidth",
      height: "#signatureHeight",
      target: "#targetSize",
      background: "#backgroundMode",
      format: "#outputFormat",
      action: "#processButton",
      clear: "#clearButton",
      progress: "#progressBar",
      status: "#toolStatus",
      originalSize: "#originalSize",
      outputSize: "#outputSize"
    },
    maxFileBytes: MAX_FILE,
    accept: (file) => /^image\/(jpeg|png|webp)$/i.test(file.type),
    invalidTypeMessage: "Choose a JPG, PNG or WebP image.",
    maxFileMessage: "Keep the signature image below 15 MB.",
    emptySummary: "No signature image selected",
    initialMessage: "Choose a signature image. You can resize it, clean a white background and keep the output under a target size.",
    readyMessage: "Ready to create a clean signature image.",
    readErrorMessage: "The signature image could not be read.",
    onFileSelected: async ({ file, state, el }) => {
      state.image = await loadImage(file);
      el.outputSize.textContent = "—";
    },
    onReset: ({ el }) => {
      el.outputSize.textContent = "—";
    },
    onProcess: async ({ file, state, el, setProgress, setStatus, formatBytes, safeBaseName, downloadBlob }) => {
      const width = Math.max(50, Number(el.width.value || 600));
      const height = Math.max(30, Number(el.height.value || 200));
      const targetBytes = Math.max(5, Number(el.target.value || 100)) * 1024;
      const mime = el.format.value;
      const transparent = el.background.value === "transparent";

      setProgress(20);
      setStatus("Preparing the signature locally…", "info");

      const buildCanvas = () => {
        const { canvas, ctx } = createCanvas(state.image, {
          width,
          height,
          alpha: transparent
        });

        if (!transparent) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }

        drawContain(state.image, ctx, width, height);

        if (transparent) removeNearWhite(canvas);
        return canvas;
      };

      let blob = await makeBlob(buildCanvas(), mime, 0.85);
      if (!blob) throw new Error("encode-failed");

      if (mime !== "image/png") {
        blob = await findClosestBlob({
          mime,
          targetBytes,
          createCanvasForAttempt: async () => buildCanvas(),
          minQuality: 0.2,
          maxQuality: 0.95,
          iterations: 9
        });
      }

      el.outputSize.textContent = formatBytes(blob.size);
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

      downloadBlob(blob, safeBaseName(file.name) + "-signature." + ext);
      setProgress(100);
      setStatus("Done — resized and prepared your signature locally. Output: " + formatBytes(blob.size) + ".", "success");
    }
  });

  tool.mount();
}
