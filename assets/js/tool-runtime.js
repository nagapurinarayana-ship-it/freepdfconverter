/**
 * Dynamic tool bootstrap.
 *
 * A page declares <body data-tool="tool-id"> and the matching module is loaded
 * automatically. Adding a tool therefore does not require editing this runtime.
 */
(async function () {
  "use strict";

  const TOOL_MODULES = /*__TOOL_MODULE_MAP__*/({});

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
    const module = await import("./tools/" + toolId + ".tool.js");
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
