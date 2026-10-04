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

const NATIVE_PICKER_RECOVERY = new Map([
  ["photo-compressor", { inputId: "imageFile" }],
  ["signature-resizer", { inputId: "signatureFile" }]
]);

for (const tool of NEW_IMAGE_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");
  const currentFiles = await readdir(toolsDir);
  const toolFiles = currentFiles
    .filter((file) => new RegExp(`^${tool.name}\\.tool(?:\\.[a-f0-9]+)?\\.js$`).test(file))
    .sort();

  if (toolFiles.length === 0) throw new Error(`${tool.name}: no generated tool module found in ${toolsDir}`);

  const sourceFile = toolFiles.find((file) => file === `${tool.name}.tool.js`) || toolFiles[0];
  const moduleSource = await readFile(path.join(toolsDir, sourceFile), "utf8");
  const moduleHash = createHash("sha256").update(moduleSource).digest("hex").slice(0, 10);
  const fingerprintedModuleName = `${tool.name}.tool.${moduleHash}.js`;

  if (sourceFile !== fingerprintedModuleName) {
    await writeFile(path.join(toolsDir, fingerprintedModuleName), moduleSource, "utf8");
    await rm(path.join(toolsDir, sourceFile), { force: true });
  }

  for (const oldModule of toolFiles.filter((file) => file !== sourceFile && file !== fingerprintedModuleName)) {
    await rm(path.join(toolsDir, oldModule), { force: true });
  }

  const affectedTool = NATIVE_PICKER_RECOVERY.has(tool.name);
  const entrySource = affectedTool
    ? `function start() {\n  if (!window.FreePDF) {\n    window.setTimeout(start, 0);\n    return;\n  }\n  import("/assets/js/tools/${fingerprintedModuleName}").then(function (module) {\n    module.mount();\n  }).catch(function (error) {\n    console.error("FreePDF tool bootstrap failed:", error);\n  });\n}\n\nif (document.readyState === "loading") {\n  document.addEventListener("DOMContentLoaded", start, { once: true });\n} else {\n  start();\n}\n`
    : `import { mount } from "/assets/js/tools/${fingerprintedModuleName}";\nmount();\n`;

  const entryHash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const entryName = `${tool.name}.entry.${entryHash}.js`;
  await writeFile(path.join(toolsDir, entryName), entrySource, "utf8");

  const entryFiles = (await readdir(toolsDir)).filter((file) =>
    new RegExp(`^${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js$`).test(file)
  );
  for (const oldEntry of entryFiles.filter((file) => file !== entryName)) {
    await rm(path.join(toolsDir, oldEntry), { force: true });
  }

  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.tool(?:\\.[a-f0-9]+)?\\.js["'][^>]*></script>`, "gi"),
    ""
  );
  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js["'][^>]*></script>`, "gi"),
    `<script type="module" src="/assets/js/tools/${entryName}"></script>`
  );

  html = html.replace(/\sdata-targeted-android-picker(?:=["'][^"']*["'])?/gi, "");
  html = html.replace(/\sdata-targeted-android-accept=["'][^"']*["']/gi, "");
  html = html.replace(/\sdata-new-tool-picker(?:=["'][^"']*["'])?/gi, "");
  html = html.replace(/\sdata-new-tool-accept=["'][^"']*["']/gi, "");
  html = html.replace(/<script id="new-tool-android-picker">[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<script id="targeted-android-file-picker">[\s\S]*?<\/script>/gi, "");

  const recovery = NATIVE_PICKER_RECOVERY.get(tool.name);
  if (recovery) {
    const inputPattern = new RegExp(
      `<input\\b([^>]*\\bid=["']${recovery.inputId}["'][^>]*)>`,
      "i"
    );
    html = html.replace(inputPattern, (match, attrs) => {
      // Android Chrome has been unreliable when these two new tools combine
      // the native image accept filter with the picker. Keep the native input
      // unrestricted and let ToolController perform the real file validation.
      const nextAttrs = attrs.replace(/\saccept=["'][^"']*["']/i, "") + " data-new-tool-picker=\"1\"";
      return `<input${nextAttrs}>`;
    });
  }

  if (!html.includes(`/assets/js/tools/${entryName}`)) {
    throw new Error(`${tool.name}: entry was not installed into the page`);
  }

  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replace(
    new RegExp(`/assets/js/tools/${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js`, "g"),
    `/assets/js/tools/${entryName}`
  );
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  await writeFile(pagePath, html, "utf8");
}

console.log("Final new-tool strategy applied; Photo Compressor and Signature Resizer use dynamic bootstrap plus native picker recovery with fingerprinted cache-busting entries, while the other three image tools retain the existing entry contract. Existing working tools remain unchanged.");
