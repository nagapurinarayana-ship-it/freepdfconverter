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
const files = await readdir(toolsDir);

for (const tool of NEW_IMAGE_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");

  // The source page's direct tool module is removed by postbuild-image-tools.
  // Keep the new-tool bootstrap isolated, but use a simple static module import
  // rather than a second dynamic-import hop. This makes startup deterministic.
  const modulePath = path.join(toolsDir, `${tool.name}.tool.js`);
  const moduleSource = await readFile(modulePath, "utf8");
  const moduleHash = createHash("sha256").update(moduleSource).digest("hex").slice(0, 10);
  const fingerprintedModuleName = `${tool.name}.tool.${moduleHash}.js`;
  await writeFile(path.join(toolsDir, fingerprintedModuleName), moduleSource, "utf8");
  await rm(modulePath, { force: true });

  for (const oldModule of files.filter((file) =>
    new RegExp(`^${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(file) &&
    file !== fingerprintedModuleName
  )) {
    await rm(path.join(toolsDir, oldModule), { force: true });
  }

  const entrySource = `import { mount } from "/assets/js/tools/${fingerprintedModuleName}";\nmount();\n`;
  const entryHash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const fingerprintedEntryName = `${tool.name}.entry.${entryHash}.js`;
  await writeFile(path.join(toolsDir, fingerprintedEntryName), entrySource, "utf8");

  for (const oldEntry of files.filter((file) =>
    new RegExp(`^${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`).test(file) &&
    file !== fingerprintedEntryName
  )) {
    await rm(path.join(toolsDir, oldEntry), { force: true });
  }

  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.entry(?:\\.[a-f0-9]{10})?\\.js["'][^>]*></script>`, "gi"),
    `<script type="module" src="/assets/js/tools/${fingerprintedEntryName}"></script>`
  );

  if (!html.includes(fingerprintedEntryName)) {
    throw new Error(`${tool.name}: fingerprinted static entry was not installed into the page`);
  }

  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replace(
    new RegExp(`/assets/js/tools/${tool.name}\\.entry\\.js`, "g"),
    `/assets/js/tools/${fingerprintedEntryName}`
  );
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into generated HTML`);
  }

  await writeFile(pagePath, html, "utf8");
}

// Do NOT override the native Android file picker here. Chrome Android has had
// regressions around both media-picker filtering and File System Access API
// flows. The six new tools should use the same proven native <input type=file>
// contract as the existing working tools. Their controllers already receive a
// stable File snapshot from common.js and perform their own type validation.
for (const tool of NEW_TOOL_PICKER_PAGES) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");
  const inputPattern = new RegExp(
    `<input\\b([^>]*\\bid=["']${tool.inputId}["'][^>]*)>`,
    "i"
  );
  html = html.replace(inputPattern, (match, attrs) => {
    let nextAttrs = attrs.replace(/\\sdata-new-tool-picker(?:=["'][^"']*["'])?/i, "");
    nextAttrs = nextAttrs.replace(/\\sdata-new-tool-accept=["'][^"']*["']/i, "");
    return `<input${nextAttrs}>`;
  });
  html = html.replace(/<script id="new-tool-android-picker">[\\s\\S]*?<\\/script>/gi, "");
  await writeFile(pagePath, html, "utf8");
}

console.log(
  "Final isolated strategy applied only to the five new image tools; native file-input handling preserved for the six new tools. Existing working tools remain unchanged."
);
