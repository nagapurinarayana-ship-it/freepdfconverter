import { createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const toolsDir = path.join(dist, "assets/js/tools");
const serviceWorkerPath = path.join(dist, "service-worker.js");

const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

// Keep the new tools isolated from the existing loader, but use the same
// proven native <input type=file> flow as the working new tools.
// Photo Compressor and Signature Resizer use a stable bootstrap so the
// service worker cannot serve an obsolete entry point after deployment.
for (const tool of NEW_IMAGE_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");
  const currentFiles = await readdir(toolsDir);
  const toolFiles = currentFiles
    .filter((file) => new RegExp(`^${tool.name}\\.tool(?:\\.[a-f0-9]+)?\\.js$`).test(file))
    .sort();

  if (toolFiles.length === 0) {
    throw new Error(`${tool.name}: no generated tool module found in ${toolsDir}`);
  }

  const sourceFile = toolFiles.find((file) => file === `${tool.name}.tool.js`) || toolFiles[0];
  const moduleSource = await readFile(path.join(toolsDir, sourceFile), "utf8");
  const moduleHash = createHash("sha256").update(moduleSource).digest("hex").slice(0, 10);
  const fingerprintedModuleName = sourceFile.includes(".tool.")
    ? sourceFile
    : `${tool.name}.tool.${moduleHash}.js`;

  if (fingerprintedModuleName !== sourceFile) {
    await writeFile(path.join(toolsDir, fingerprintedModuleName), moduleSource, "utf8");
    await rm(path.join(toolsDir, sourceFile), { force: true });
  }

  for (const oldModule of toolFiles.filter((file) => file !== fingerprintedModuleName)) {
    await rm(path.join(toolsDir, oldModule), { force: true });
  }

  const useStableEntry = tool.name === "photo-compressor" || tool.name === "signature-resizer";
  const entrySource = useStableEntry
    ? `import { mount } from "/assets/js/tools/${fingerprintedModuleName}";\n\nfunction start() {\n  if (window.FreePDF && typeof window.FreePDF.bindDropZone === "function") {\n    mount();\n    return;\n  }\n  window.setTimeout(start, 0);\n}\n\nif (document.readyState === "loading") {\n  document.addEventListener("DOMContentLoaded", start, { once: true });\n} else {\n  start();\n}\n`
    : `import { mount } from "/assets/js/tools/${fingerprintedModuleName}";\nmount();\n`;
  const entryHash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const stableEntryName = useStableEntry
    ? `${tool.name}.entry.js`
    : `${tool.name}.entry.${entryHash}.js`;
  await writeFile(path.join(toolsDir, stableEntryName), entrySource, "utf8");

  const entryFiles = (await readdir(toolsDir)).filter((file) =>
    new RegExp(`^${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js$`).test(file)
  );
  for (const entryFile of entryFiles.filter((file) => file !== stableEntryName)) {
    await rm(path.join(toolsDir, entryFile), { force: true });
  }

  // Remove old direct module tags and install exactly one entry.
  // Existing working tools keep their current fingerprinted entry strategy.
  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.tool(?:\\.[a-f0-9]+)?\\.js["'][^>]*></script>`, "gi"),
    ""
  );
  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js["'][^>]*></script>`, "gi"),
    `<script type="module" src="/assets/js/tools/${stableEntryName}"></script>`
  );

  // Remove legacy custom-picker markers/scripts. The native file input remains
  // the source of truth for all five new image tools.
  html = html.replace(/\sdata-targeted-android-picker(?:=["'][^"']*["'])?/gi, "");
  html = html.replace(/\sdata-targeted-android-accept=["'][^"']*["']/gi, "");
  html = html.replace(/\sdata-new-tool-picker(?:=["'][^"']*["'])?/gi, "");
  html = html.replace(/\sdata-new-tool-accept=["'][^"']*["']/gi, "");
  html = html.replace(/<script id="new-tool-android-picker">[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<script id="targeted-android-file-picker">[\s\S]*?<\/script>/gi, "");

  if (!html.includes(stableEntryName)) {
    throw new Error(`${tool.name}: entry was not installed into the page`);
  }

  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replace(
    new RegExp(`/assets/js/tools/${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js`, "g"),
    `/assets/js/tools/${stableEntryName}`
  );
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  await writeFile(pagePath, html, "utf8");
}

console.log(
  "Final isolated new-tool strategy applied to the five new image tools; Photo Compressor and Signature Resizer use stable guarded bootstraps, while the other new tools retain their existing fingerprinted entries. Existing working tools remain unchanged."
);