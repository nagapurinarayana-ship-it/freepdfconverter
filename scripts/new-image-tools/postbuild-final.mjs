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

// Only these two affected flows get the Android File System Access picker.
// The other four currently working new image tools keep their existing path.
const TARGETED_ANDROID_PICKER_PAGES = [
  { page: "tools/sign-pdf.html", inputId: "pdfFile", accept: "application/pdf,.pdf" },
  { page: "tools/photo-compressor.html", inputId: "imageFile", accept: "image/*" }
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

  const entrySource = `import { mount } from "/assets/js/tools/${fingerprintedModuleName}";\nmount();\n`;
  const entryHash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const stableEntryName = `${tool.name}.entry.${entryHash}.js`;
  await writeFile(path.join(toolsDir, stableEntryName), entrySource, "utf8");

  const entryFiles = (await readdir(toolsDir)).filter((file) =>
    new RegExp(`^${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js$`).test(file)
  );
  for (const entryFile of entryFiles.filter((file) => file !== stableEntryName)) {
    await rm(path.join(toolsDir, entryFile), { force: true });
  }

  // Keep exactly one runtime bootstrap after fingerprinting.
  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.tool(?:\\.[a-f0-9]+)?\\.js["'][^>]*></script>`, "gi"),
    ""
  );
  html = html.replace(
    new RegExp(`<script[^>]*src=["'][^"']*/${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js["'][^>]*></script>`, "gi"),
    `<script type="module" src="/assets/js/tools/${stableEntryName}"></script>`
  );

  if (!html.includes(stableEntryName)) {
    throw new Error(`${tool.name}: fingerprinted static entry was not installed into the page`);
  }

  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replace(
    new RegExp(`/assets/js/tools/${tool.name}\\.entry(?:\\.[a-f0-9]+)?\\.js`, "g"),
    `/assets/js/tools/${stableEntryName}`
  );
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  await writeFile(pagePath, html, "utf8");
}

// Android Chrome can return from DocumentsUI with an empty FileList in these
// two affected flows. Use the proven File System Access picker handoff here,
// while leaving the four currently working image tools untouched.
const pickerScript = `<script id="targeted-android-file-picker">(function(){"use strict";function init(){document.querySelectorAll('input[type="file"][data-targeted-android-picker]').forEach(function(input){if(input.dataset.targetedAndroidPickerBound)return;input.dataset.targetedAndroidPickerBound="1";var label=document.querySelector('label[for="'+input.id+'"]');var accept=input.getAttribute("data-targeted-android-accept")||"";var isPdf=/pdf/i.test(accept);if(!label||typeof window.showOpenFilePicker!=="function")return;label.addEventListener("click",function(event){event.preventDefault();event.stopPropagation();(async function(){try{var options={multiple:input.hasAttribute("multiple"),excludeAcceptAllOption:true,types:[{description:isPdf?"PDF files":"Images",accept:isPdf?{"application/pdf":[".pdf"]}:{"image/jpeg":[".jpg",".jpeg"],"image/png":[".png"],"image/webp":[".webp"]}}]};var handles=await window.showOpenFilePicker(options);var files=await Promise.all(handles.map(function(handle){return handle.getFile();}));if(!files.length)return;var transfer=new DataTransfer();files.forEach(function(file){transfer.items.add(file);});input.files=transfer.files;input.dispatchEvent(new Event("change",{bubbles:true}));}catch(error){if(error&&error.name==="AbortError")return;console.error("FreePDF targeted Android picker failed",error);try{input.click();}catch(_){} }})();});});}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();}());</script>`;

for (const tool of TARGETED_ANDROID_PICKER_PAGES) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");

  const inputPattern = new RegExp(
    `<input\\b([^>]*\\bid=["']${tool.inputId}["'][^>]*)>`,
    "i"
  );

  html = html.replace(inputPattern, (match, attrs) => {
    let nextAttrs = attrs.replace(/\sdata-targeted-android-picker(?:=["'][^"']*["'])?/i, "");
    nextAttrs = nextAttrs.replace(/\sdata-targeted-android-accept=["'][^"']*["']/i, "");
    nextAttrs = nextAttrs.replace(/\sdata-new-tool-picker(?:=["'][^"']*["'])?/i, "");
    nextAttrs = nextAttrs.replace(/\sdata-new-tool-accept=["'][^"']*["']/i, "");
    nextAttrs = nextAttrs.replace(/\saccept=["'][^"']*["']/i, "");
    nextAttrs += ` data-targeted-android-picker="1" data-targeted-android-accept="${tool.accept}" accept="${tool.accept}"`;
    return `<input${nextAttrs}>`;
  });

  if (!html.includes(`id="${tool.inputId}"`) || !html.includes("data-targeted-android-picker")) {
    throw new Error(`${tool.page}: targeted Android picker marker could not be installed`);
  }

  // Remove any previous picker injected by an earlier build, then install the
  // targeted picker for this page.
  html = html.replace(/<script id="new-tool-android-picker">[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<script id="targeted-android-file-picker">[\s\S]*?<\/script>/gi, "");
  html = html.replace("</head>", pickerScript + "</head>");

  await writeFile(pagePath, html, "utf8");
}

console.log(
  "Final new-tool strategy applied: fingerprinted runtime entries for all five image tools; targeted Android File System Access picker applied only to Photo Compressor and Sign PDF. Existing working tools remain unchanged."
);
