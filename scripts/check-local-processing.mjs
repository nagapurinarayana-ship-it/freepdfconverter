import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const toolScripts = new Set([
  "assets/js/common.js",
  "assets/js/merge-pdf.js",
  "assets/js/split-pdf.js",
  "assets/js/unlock-pdf.js",
  "assets/js/rotate-pdf.js",
  "assets/js/jpg-to-pdf.js",
  "assets/js/pdf-to-image.js",
  "assets/js/watermark-pdf.js",
  "assets/js/organize-pdf.js",
  "assets/js/add-page-numbers.js",
  "assets/js/remove-pdf-metadata.js",
  "assets/js/crop-pdf.js",
  "assets/js/extract-pdf-text.js",
  "assets/js/pdf-to-word.js",
  "assets/js/word-to-pdf.js",
  "assets/js/ocr-pdf.js",
  "assets/js/compress-pdf.js",
  "assets/js/compress-pdf-worker.js"
]);
const networkPattern = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|\bnavigator\.sendBeacon\s*\(/i;
const forbiddenUploadPattern = /(?:method\s*:\s*["']POST["']|\.open\s*\(\s*["']POST["']|\.send\s*\(|multipart\/form-data|FormData\s*\()/i;

const failures = [];
for (const relative of toolScripts) {
  try {
    const source = await readFile(path.join(root, relative), "utf8");
    if (networkPattern.test(source)) failures.push(relative + " -> browser network API detected in a document-processing script");
    if (forbiddenUploadPattern.test(source)) failures.push(relative + " -> upload-style network pattern detected");
  } catch {
    failures.push(relative + " -> required script missing");
  }
}

const htmlFiles = [];
async function collect(directory) {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && !["node_modules","dist",".git"].includes(entry.name)) await collect(full);
    else if (entry.isFile() && entry.name.startsWith("tools/") && entry.name.endsWith(".html")) htmlFiles.push(full);
  }
}
await collect(root);

for (const file of htmlFiles) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const html = await readFile(file, "utf8");
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]).filter(src=>src.startsWith("../assets/js/"));
  for (const src of scripts) {
    const asset = src.replace(/^\.\.\//, "");
    if (!toolScripts.has(asset) && /(?:ads|monetization-config|common)\.js$/i.test(asset) === false) continue;
    const source = await readFile(path.join(root, asset), "utf8");
    if (networkPattern.test(source) && !/assets\/js\/ads\.js$/.test(asset)) failures.push(relative + " -> local processing page depends on network-capable script " + asset);
  }
}

if (failures.length) {
  console.error("Local-processing source checks failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Local-processing source checks passed: document-processing code contains no direct network APIs or upload patterns.");