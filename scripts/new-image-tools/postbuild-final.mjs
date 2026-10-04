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
  { page: "tools/sign-pdf.html", inputId: "pdfFile", accept: "application/pdf,.pdf", description: "PDF files", mime: "application/pdf", extensions: [".pdf"] },
  { page: "tools/photo-compressor.html", inputId: "imageFile", accept: "image/*", description: "Images", mime: "image/*", extensions: [".jpg", ".jpeg", ".png", ".webp"] },
  { page: "tools/signature-resizer.html", inputId: "signatureFile", accept: "image/*", description: "Images", mime: "image/*", extensions: [".jpg", ".jpeg", ".png", ".webp"] },
  { page: "tools/passport-id-photo-maker.html", inputId: "photoFile", accept: "image/*", description: "Images", mime: "image/*", extensions: [".jpg", ".jpeg", ".png", ".webp"] },
  { page: "tools/thumb-impression-resizer.html", inputId: "thumbFile", accept: "image/*", description: "Images", mime: "image/*", extensions: [".jpg", ".jpeg", ".png", ".webp"] },
  { page: "tools/handwritten-declaration-resizer.html", inputId: "declarationFile", accept: "image/*", description: "Images", mime: "image/*", extensions: [".jpg", ".jpeg", ".png", ".webp"] }
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

// Only the six new tools receive this picker behavior. Existing tools do not
// receive this marker or script and keep their proven picker unchanged.
// On browsers with File System Access support (including Chrome 132+ on
// Android), use showOpenFilePicker() directly. This bypasses the Android
// <input type=file> -> DocumentsUI FileList handoff that was returning an
// empty FileList in the affected flow. The selected File objects are copied
// into the existing input via DataTransfer and a normal change event is
// dispatched, so the existing tool/controller validation remains unchanged.
// Unsupported browsers keep the normal input picker as a fallback.
const pickerScript = `<script id="new-tool-android-picker">(function(){"use strict";function init(){document.querySelectorAll('input[type="file"][data-new-tool-picker]').forEach(function(input){if(input.dataset.newToolPickerBound)return;input.dataset.newToolPickerBound="1";var label=document.querySelector('label[for="'+input.id+'"]');var accept=input.getAttribute("data-new-tool-accept")||input.getAttribute("accept")||"";var isPdf=/pdf/i.test(accept);var pickerSupported=typeof window.showOpenFilePicker==="function";if(accept)input.setAttribute("accept",accept);if(!pickerSupported||!label)return;label.addEventListener("click",function(event){event.preventDefault();event.stopPropagation();(async function(){try{var options={multiple:input.hasAttribute("multiple"),excludeAcceptAllOption:true,types:[{description:isPdf?"PDF files":"Images",accept:isPdf?{"application/pdf":[".pdf"]}:{"image/jpeg":[".jpg",".jpeg"],"image/png":[".png"],"image/webp":[".webp"]}}]};var handles=await window.showOpenFilePicker(options);var files=await Promise.all(handles.map(function(handle){return handle.getFile();}));if(!files.length)return;var transfer=new DataTransfer();files.forEach(function(file){transfer.items.add(file);});input.files=transfer.files;input.dispatchEvent(new Event("change",{bubbles:true}));}catch(error){if(error&&error.name==="AbortError")return;console.error("FreePDF native file picker failed",error);try{input.click();}catch(_){} }})();});});}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();}());</script>`;

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
  "Final new-tool strategy applied to all five new image tools; File System Access picker applied only to the six new tools. Existing working tools remain unchanged."
);