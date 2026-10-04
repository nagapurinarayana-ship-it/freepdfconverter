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
  { page: "tools/sign-pdf.html", inputId: "pdfFile", accept: "application/pdf,.pdf" },
  { page: "tools/photo-compressor.html", inputId: "imageFile", accept: "image/*" },
  { page: "tools/signature-resizer.html", inputId: "signatureFile", accept: "image/*" },
  { page: "tools/passport-id-photo-maker.html", inputId: "photoFile", accept: "image/*" },
  { page: "tools/thumb-impression-resizer.html", inputId: "thumbFile", accept: "image/*" },
  { page: "tools/handwritten-declaration-resizer.html", inputId: "declarationFile", accept: "image/*" }
];

const serviceWorkerPath = path.join(dist, "service-worker.js");
const files = await readdir(toolsDir);

for (const tool of NEW_IMAGE_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");

  const modulePattern = new RegExp(
    `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
    "gi"
  );
  html = html.replace(modulePattern, "");

  const stableEntryPath = path.join(toolsDir, `${tool.name}.entry.js`);
  const entrySource = await readFile(stableEntryPath, "utf8");
  const hash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const fingerprintedName = `${tool.name}.entry.${hash}.js`;

  await writeFile(path.join(toolsDir, fingerprintedName), entrySource, "utf8");
  await rm(stableEntryPath, { force: true });

  for (const oldEntry of files.filter((file) =>
    new RegExp(`^${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`).test(file) &&
    file !== fingerprintedName
  )) {
    await rm(path.join(toolsDir, oldEntry), { force: true });
  }

  const entryScript = `<script type="module" src="/assets/js/tools/${fingerprintedName}"></script>`;
  const entryPattern = new RegExp(
    `<script[^>]*(?:src=["'][^"']*/)?${tool.name}\\.entry(?:\\.[a-f0-9]{10})?\\.js["'][^>]*></script>`,
    "gi"
  );

  const nextHtml = html.replace(entryPattern, entryScript);
  if (nextHtml === html && !html.includes(fingerprintedName)) {
    throw new Error(`${tool.name}: could not install fingerprinted entry script`);
  }
  html = nextHtml;

  if (!html.includes(fingerprintedName)) {
    throw new Error(`${tool.name}: fingerprinted entry was not installed into the page`);
  }

  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replace(
    new RegExp(`/assets/js/tools/${tool.name}\\.entry\\.js`, "g"),
    `/assets/js/tools/${fingerprintedName}`
  );
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into generated HTML`);
  }

  await writeFile(pagePath, html, "utf8");
}

// Only the six new tools receive this mobile picker behavior. Existing tools
// do not receive this marker or script and keep their proven picker unchanged.
// IMPORTANT: do not remove accept on Android. Removing it routes Chromium to
// the generic DocumentsUI, which can make image selection appear to succeed
// visually but return no usable selection. Use a broad media accept instead:
// image/* for image tools and application/pdf for Sign PDF. The tool's own
// JavaScript validation remains authoritative for the supported formats.
const pickerScript = `<script id="new-tool-android-picker">(function(){"use strict";var a=/Android/i.test(navigator.userAgent)&&/Chrome|Chromium|CriOS|EdgA|OPR/i.test(navigator.userAgent)&&!/Firefox|FxiOS/i.test(navigator.userAgent);if(!a)return;function f(){document.querySelectorAll('input[type="file"][data-new-tool-picker]').forEach(function(i){var t=i.getAttribute("data-new-tool-accept");if(t)i.setAttribute("accept",t);});}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",f,{once:true});else f();}());</script>`;
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
    nextAttrs = nextAttrs.replace(/\\saccept=["'][^"']*["']/i, "");
    return `<input${nextAttrs} data-new-tool-picker data-new-tool-accept="${tool.accept}">`;
  });

  if (!html.includes(`id="${tool.inputId}"`) || !html.includes("data-new-tool-picker")) {
    throw new Error(`${tool.page}: new-tool picker marker could not be installed`);
  }

  if (!html.includes('id="new-tool-android-picker"')) {
    html = html.replace("</head>", pickerScript + "</head>");
  }

  if (!html.includes('id="new-tool-android-picker"')) {
    throw new Error(`${tool.page}: Android picker script could not be installed`);
  }

  await writeFile(pagePath, html, "utf8");
}

console.log(
  "Final new-tool strategy applied to all five new image tools; Android-safe native file-picker handling applied only to the six new tools with broad media accept types. Existing working tools remain unchanged."
);
