import { createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const toolsDir = path.join(dist, "assets/js/tools");

const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

const NEW_TOOL_PICKER_PAGES = [
  { page: "tools/sign-pdf.html", inputId: "pdfFile" },
  { page: "tools/photo-compressor.html", inputId: "imageFile" },
  { page: "tools/signature-resizer.html", inputId: "signatureFile" },
  { page: "tools/passport-id-photo-maker.html", inputId: "photoFile" },
  { page: "tools/thumb-impression-resizer.html", inputId: "thumbFile" },
  { page: "tools/handwritten-declaration-resizer.html", inputId: "declarationFile" }
];

const serviceWorkerPath = path.join(dist, "service-worker.js");

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
  const fingerprintedModuleName = `${tool.name}.tool.${moduleHash}.js`;

  if (sourceFile !== fingerprintedModuleName) {
    await writeFile(path.join(toolsDir, fingerprintedModuleName), moduleSource, "utf8");
    await rm(path.join(toolsDir, sourceFile), { force: true });
  }

  for (const oldModule of toolFiles.filter((file) => file !== sourceFile && file !== fingerprintedModuleName)) {
    await rm(path.join(toolsDir, oldModule), { force: true });
  }

  // Keep the bootstrap URL stable, but make its static import point directly
  // at the fingerprinted implementation. This avoids dynamic imports and
  // avoids executing the tool module directly from the HTML page.
  const stableEntryName = `${tool.name}.entry.js`;
  const stableEntryPath = path.join(toolsDir, stableEntryName);
  const entrySource = `import { mount } from "/assets/js/tools/${fingerprintedModuleName}";\nmount();\n`;
  await writeFile(stableEntryPath, entrySource, "utf8");

  const entryFiles = (await readdir(toolsDir)).filter((file) =>
    new RegExp(`^${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js$`).test(file)
  );
  for (const oldEntry of entryFiles.filter((file) => oldEntryName(oldEntry) !== stableEntryName)) {
    await rm(path.join(toolsDir, oldEntry), { force: true });
  }

  // Ensure the page contains exactly one module bootstrap and never the
  // implementation module itself.
  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.tool(?:\\.[a-f0-9]+)?\\.js["'][^>]*></script>`, "gi"),
    ""
  );
  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js["'][^>]*></script>`, "gi"),
    `<script type="module" src="/assets/js/tools/${stableEntryName}"></script>`
  );

  if (!html.includes(`/assets/js/tools/${stableEntryName}`)) {
    throw new Error(`${tool.name}: stable ES-module bootstrap was not installed into the page`);
  }

  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replace(
    new RegExp(`/assets/js/tools/${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js`, "g"),
    `/assets/js/tools/${stableEntryName}`
  );
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  await writeFile(pagePath, html, "utf8");
}

for (const tool of NEW_TOOL_PICKER_PAGES) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");
  const inputPattern = new RegExp(
    `<input\\b([^>]*\\bid=["']${tool.inputId}["'][^>]*)>`,
    "i"
  );
  html = html.replace(inputPattern, (match, attrs) => {
    let nextAttrs = attrs.replace(/\sdata-new-tool-picker(?:=["'][^"']*["'])?/i, "");
    nextAttrs = nextAttrs.replace(/\sdata-new-tool-accept=["'][^"']*["']/i, "");
    return `<input${nextAttrs}>`;
  });
  html = html.replace(
    new RegExp('<script id="new-tool-android-picker">[\\s\\S]*?<\\/script>', "gi"),
    ""
  );
  await writeFile(pagePath, html, "utf8");
}

function oldEntryName(file) {
  return file.replace(/\.[a-f0-9]{10}(?=\.js$)/, "");
}

console.log(
  "Final isolated strategy applied only to the five new image tools; stable ES-module bootstraps now import fingerprinted implementations; native file-input handling preserved for the six new tools. Existing working tools remain unchanged."
);
