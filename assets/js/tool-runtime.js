/**
 * Dynamic tool bootstrap.
 *
 * A page declares <body data-tool="tool-id"> and the matching module is loaded
 * automatically. Adding a tool therefore does not require editing this runtime.
 */
(async function () {
  "use strict";

  // Keep a checked-in fallback map as well as the build-generated map. This is
  // important for deployments that serve the repository/static files directly
  // instead of the generated dist/ directory. Without the fallback, every new
  // .tool.js page renders but never mounts its controller, leaving the native
  // file picker showing a filename while the application still says "No files
  // selected".
  const FALLBACK_TOOL_MODULES = Object.freeze({
    "photo-compressor": "/assets/js/tools/photo-compressor.tool.js",
    "signature-resizer": "/assets/js/tools/signature-resizer.tool.js",
    "passport-id-photo-maker": "/assets/js/tools/passport-id-photo-maker.tool.js",
    "thumb-impression-resizer": "/assets/js/tools/thumb-impression-resizer.tool.js",
    "handwritten-declaration-resizer": "/assets/js/tools/handwritten-declaration-resizer.tool.js"
  });

  // The build replaces this token with the complete registry-derived map.
  // Keeping the token preserves the normal dist build while the fallback above
  // makes the source tree independently functional.
  const BUILT_TOOL_MODULES = /*__TOOL_MODULE_MAP__*/({});
  const TOOL_MODULES = Object.assign({}, FALLBACK_TOOL_MODULES, BUILT_TOOL_MODULES);

  function waitForCore() {
    if (typeof window.FreePDF?.bindDropZone === "function") return Promise.resolve();
    return new Promise((resolve) => {
      const started = Date.now();
      const timer = window.setInterval(() => {
        if (typeof window.FreePDF?.bindDropZone === "function" || Date.now() - started > 5000) {
          window.clearInterval(timer);
          resolve();
        }
      }, 16);
    });
  }

  await waitForCore();

  const toolId = document.body?.dataset?.tool;
  if (!toolId) return;

  if (!/^[a-z0-9-]+$/.test(toolId)) {
    console.error("Invalid FreePDF tool id:", toolId);
    return;
  }

  try {
    const modulePath = TOOL_MODULES[toolId];
    if (!modulePath) {
      throw new Error("No built tool module registered for: " + toolId);
    }
    const module = await import(modulePath);
    if (typeof module.mount !== "function") {
      throw new Error("Tool module must export mount()");
    }
    await module.mount();
  } catch (error) {
    console.error("FreePDF tool failed to initialize:", toolId, error);
    const status = document.querySelector('[role="status"][data-tool-status]') || document.querySelector('[role="status"]');
    if (status && window.FreePDF?.setStatus) {
      window.FreePDF.setStatus(
        status,
        "This tool could not start correctly. Refresh the page and try again. If the problem continues, use the site contact page.",
        "error"
      );
    }
  }
}());
