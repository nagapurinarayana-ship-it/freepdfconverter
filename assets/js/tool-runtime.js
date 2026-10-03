/**
 * Dynamic tool bootstrap.
 *
 * A page declares <body data-tool="tool-id"> and the matching module is loaded
 * automatically. Adding a tool therefore does not require editing this runtime.
 */
(async function () {
  "use strict";

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
  }
}());
