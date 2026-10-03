import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { articlePages, indexablePages } from "./site-config.mjs";
import { SEARCH_INTENT_PATHS } from "./generate-search-intent-pages.mjs";

const root = process.cwd();
const generatedRoutes = new Set(SEARCH_INTENT_PATHS.map((relative) => relative.replace(/\\/g, "/")));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageJson.dependencies?.["tesseract.js"] !== "7.0.0") throw new Error("OCR dependency tesseract.js must remain pinned to 7.0.0");
if (packageJson.dependencies?.["@tesseract.js-data/eng"] !== "1.0.0") throw new Error("OCR English language data dependency must remain pinned to 1.0.0");
const required = [
  "index.html", "about.html", "privacy.html", "terms.html", "contact.html",
  "tools/merge-pdf.html", "tools/split-pdf.html", "tools/rotate-pdf.html",
  "tools/unlock-pdf.html",
  "tools/jpg-to-pdf.html", "tools/pdf-to-image.html", "tools/watermark-pdf.html", "tools/sign-pdf.html", "tools/protect-pdf.html",
  "tools/organize-pdf.html", "tools/add-page-numbers.html", "tools/remove-pdf-metadata.html",
  "tools/crop-pdf.html", "tools/extract-pdf-text.html", "tools/pdf-to-word.html", "tools/word-to-pdf.html", "tools/ocr-pdf.html", "how-local-processing.html",
  ...indexablePages.filter((relative) => relative.startsWith("guides/")),
  "assets/js/common.js", "assets/js/merge-pdf.js", "assets/js/split-pdf.js",
  "assets/js/rotate-pdf.js", "assets/js/jpg-to-pdf.js", "assets/js/pdf-to-image.js",
  "assets/js/watermark-pdf.js", "assets/js/sign-pdf.js", "assets/js/protect-pdf.js", "assets/js/protect-pdf-worker.js", "assets/css/styles.css"
  , "assets/js/organize-pdf.js", "assets/js/add-page-numbers.js", "assets/js/remove-pdf-metadata.js",
  "assets/js/crop-pdf.js", "assets/js/extract-pdf-text.js", "assets/js/pdf-to-word.js", "assets/js/word-to-pdf.js", "assets/js/ocr-pdf.js", "assets/js/unlock-pdf.js", "assets/js/unlock-pdf-worker.js",
  "assets/vendor/pdf-lib/pdf-lib.min.js",
  "assets/vendor/jszip/jszip.min.js", "assets/vendor/pdfjs/pdf.min.mjs", "assets/vendor/pdfjs/pdf.worker.min.mjs",
  "assets/vendor/qpdf/qpdf.js", "assets/vendor/qpdf/qpdf.wasm", "assets/vendor/qpdf/LICENSE-QPDF-WASM.txt",
  "assets/vendor/qpdf/LICENSE-QPDF.txt", "assets/vendor/qpdf/NOTICE-QPDF.md", "assets/vendor/qpdf/README.md",
  "scripts/vendor-tesseract.mjs",
  "assets/images/freepdf-tools-social.jpg", "favicon.ico", "manifest.webmanifest", "service-worker.js", "offline.html", "_redirects"
];
for (const relative of required) await access(path.join(root, relative));

async function htmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "dist" && entry.name !== "node_modules") result.push(...await htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) result.push(full);
  }
  return result;
}

const broken = [];
const titles = new Map();
const descriptions = new Map();
for (const file of await htmlFiles(root)) {
  const html = await readFile(file, "utf8");
  if (!/<html[\s>]/i.test(html)) continue;
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const href of refs) {
    if (/^(?:https?:|#|data:|mailto:)/.test(href)) continue;
    const clean = href.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = clean.startsWith("/") ? path.join(root, clean.slice(1)) : path.resolve(path.dirname(file), clean);
    const relativeTarget = path.relative(root, target).replaceAll(path.sep, "/");
    const normalizedTarget = relativeTarget.replace(/\.html$/, "").replace(/\/$/, "");
    const generatedMatch = [...generatedRoutes].some((relative) => {
      const normalizedGenerated = relative.replace(/\.html$/, "").replace(/\/$/, "").replace(/\/index$/, "");
      return normalizedTarget === normalizedGenerated;
    });
    if (generatedMatch) continue;
    if (!await localTargetExists(target)) broken.push(path.relative(root, file) + " -> " + href);
  }
  const relative = path.relative(root, file);
  if (!indexablePages.includes(relative)) continue;
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (!title) broken.push(relative + " -> missing title");
  if (!description) broken.push(relative + " -> missing meta description");
  if (h1Count !== 1) broken.push(relative + " -> expected exactly one h1, found " + h1Count);
  for (const image of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt="[^"]+"/i.test(image[1])) broken.push(relative + " -> image missing descriptive alt text");
  }
  if (articlePages.has(relative) && (html.match(/<img\b/gi) || []).length < 2) broken.push(relative + " -> guide needs at least two instructional images");
  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/i.test(html)) broken.push(relative + " -> third-party code CDN reference remains");
  if (title) addDuplicate(titles, title, relative);
  if (description) addDuplicate(descriptions, description, relative);
}
for (const [title, pages] of titles) if (pages.length > 1) broken.push("Duplicate title: " + title + " -> " + pages.join(", "));
for (const [description, pages] of descriptions) if (pages.length > 1) broken.push("Duplicate description -> " + pages.join(", "));

const sourceFilesForDownloadPolicy = [
  ...(await htmlFiles(path.join(root, "tools")))
];
const toolJavaScriptFiles = [];
for (const directory of [path.join(root, "assets/js"), path.join(root, "assets/js/tools"), path.join(root, "assets/js/core")]) {
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isFile() && /\.js$/.test(entry.name)) toolJavaScriptFiles.push(path.join(directory, entry.name));
    }
  } catch { /* Directory may not exist in a partial checkout. */ }
}
for (const file of sourceFilesForDownloadPolicy) {
  const content = await readFile(file, "utf8");
  if (/\bZIP\b/i.test(content)) {
    broken.push(path.relative(root, file) + " -> ZIP archive downloads are prohibited; generated files must download directly");
  }
}
for (const file of toolJavaScriptFiles) {
  const content = await readFile(file, "utf8");
  if (/\.zip\b/i.test(content) || /(?:downloadBlob\([^\n]*\.zip)/i.test(content)) {
    broken.push(path.relative(root, file) + " -> ZIP archive downloads are prohibited; generated files must download directly");
  }
  if (file.endsWith("assets/js/common.js")) {
    const changeStart = content.indexOf("bindFileInput(input, onFiles)");
    if (changeStart < 0 || !content.includes("input.parentNode.replaceChild(replacement, input)")) {
      broken.push(path.relative(root, file) + " -> common file-picker must snapshot files and reset the native input by replacement");
    }
  }
  if (file.endsWith("assets/js/core/tool-controller.js")) {
    const changeStart = content.indexOf("this.bindFileInput(input)");
    if (changeStart < 0 || !content.includes("input.parentNode.replaceChild(replacement, input)")) {
      broken.push(path.relative(root, file) + " -> ToolController file-picker must snapshot files and reset the native input by replacement");
    }
  }
  if (/instanceof\s+File\b/.test(content)) {
    broken.push(path.relative(root, file) + " -> avoid instanceof File for browser picker compatibility; use file-like checks");
  }
}

const toolScripts = {
  "tools/merge-pdf.html": "assets/js/merge-pdf.js",
  "tools/split-pdf.html": "assets/js/split-pdf.js",
  "tools/unlock-pdf.html": "assets/js/unlock-pdf.js",
  "tools/rotate-pdf.html": "assets/js/rotate-pdf.js",
  "tools/jpg-to-pdf.html": "assets/js/jpg-to-pdf.js",
  "tools/pdf-to-image.html": "assets/js/pdf-to-image.js",
  "tools/watermark-pdf.html": "assets/js/watermark-pdf.js",
  "tools/sign-pdf.html": "assets/js/sign-pdf.js",
  "tools/protect-pdf.html": "assets/js/protect-pdf.js",
  "tools/organize-pdf.html": "assets/js/organize-pdf.js",
  "tools/add-page-numbers.html": "assets/js/add-page-numbers.js",
  "tools/remove-pdf-metadata.html": "assets/js/remove-pdf-metadata.js",
  "tools/crop-pdf.html": "assets/js/crop-pdf.js",
  "tools/extract-pdf-text.html": "assets/js/extract-pdf-text.js",
  "tools/ocr-pdf.html": "assets/js/ocr-pdf.js",
  "tools/pdf-to-word.html": "assets/js/pdf-to-word.js",
  "tools/word-to-pdf.html": "assets/js/word-to-pdf.js"
};
for (const [htmlPath, scriptPath] of Object.entries(toolScripts)) {
  const html = await readFile(path.join(root, htmlPath), "utf8");
  const script = await readFile(path.join(root, scriptPath), "utf8");
  const ids = [...script.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
  for (const id of ids) if (!html.includes('id="' + id + '"')) broken.push(htmlPath + " -> script expects missing #" + id);
}

if (broken.length) {
  console.error("Broken local references:\n" + broken.join("\n"));
  process.exit(1);
}
console.log("Static checks passed: required files exist and local HTML references resolve.");

async function localTargetExists(target) {
  for (const candidate of [target, target + ".html", path.join(target, "index.html")]) {
    try { await access(candidate); return true; } catch { /* Try the next clean-URL form. */ }
  }
  return false;
}

function addDuplicate(map, value, relative) {
  const pages = map.get(value) || [];
  pages.push(relative);
  map.set(value, pages);
}
