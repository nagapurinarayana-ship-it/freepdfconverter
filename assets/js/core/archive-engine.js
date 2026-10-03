let zipPromise = null;

export async function ensureJsZip() {
  if (window.JSZip) return window.JSZip;
  if (!zipPromise) {
    zipPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-freepdf-jszip="true"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "/assets/vendor/jszip/jszip.min.js";
      script.async = true;
      script.dataset.freepdfJszip = "true";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  await zipPromise;
  if (!window.JSZip) throw new Error("zip-engine-not-loaded");
  return window.JSZip;
}

export async function createZipBlob(entries) {
  const JSZip = await ensureJsZip();
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.name, entry.blob);
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}
