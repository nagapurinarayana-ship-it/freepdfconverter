import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const pdfLibSource = await readFile(path.join(root, "assets/vendor/pdf-lib/pdf-lib.min.js"), "utf8");
const sandbox = {
  console, setTimeout, clearTimeout, TextEncoder, TextDecoder, ArrayBuffer, Uint8Array,
  atob: (value) => Buffer.from(value, "base64").toString("binary"),
  btoa: (value) => Buffer.from(value, "binary").toString("base64")
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
vm.runInContext(pdfLibSource, context, { filename: "pdf-lib.min.js" });
const P = sandbox.PDFLib;
assert.ok(P && P.PDFDocument, "self-hosted pdf-lib should expose PDFDocument");
const vmArray = (...values) => {
  const array = vm.runInContext("[]", context);
  array.push(...values);
  return array;
};

const sample = await P.PDFDocument.create();
sample.setTitle("Internal sample title");
sample.setAuthor("Example Author");
sample.setKeywords(vmArray("internal", "sample"));
const font = await sample.embedFont(P.StandardFonts.Helvetica);
for (let index = 0; index < 4; index += 1) {
  const page = sample.addPage(vmArray(401 + index, 600 + index));
  page.drawText("SOURCE PAGE " + (index + 1), { x: 40, y: 520, size: 20, font });
}
const metadataStream = sample.context.flateStream(new TextEncoder().encode("<x:xmpmeta>private sample</x:xmpmeta>"), { Type: P.PDFName.of("Metadata"), Subtype: P.PDFName.of("XML") });
sample.catalog.set(P.PDFName.of("Metadata"), sample.context.register(metadataStream));
const sampleBytes = await sample.save({ useObjectStreams: true });

// Organize: copy source pages 3 and 1 in that order, mirroring the browser tool.
const organizeSource = await P.PDFDocument.load(sampleBytes, { updateMetadata: false });
const organized = await P.PDFDocument.create();
const organizedPages = await organized.copyPages(organizeSource, vmArray(2, 0));
organizedPages.forEach((page) => organized.addPage(page));
const organizedReloaded = await P.PDFDocument.load(await organized.save(), { updateMetadata: false });
assert.equal(organizedReloaded.getPageCount(), 2);
assert.equal(organizedReloaded.getPage(0).getWidth(), 403);
assert.equal(organizedReloaded.getPage(1).getWidth(), 401);

// Page numbers: draw 7 and 8 onto the first two pages.
const numbered = await P.PDFDocument.load(sampleBytes, { updateMetadata: false });
const numberFont = await numbered.embedFont(P.StandardFonts.Helvetica);
numbered.getPages().slice(0, 2).forEach((page, index) => {
  const value = String(7 + index);
  const width = numberFont.widthOfTextAtSize(value, 12);
  page.drawText(value, { x: (page.getWidth() - width) / 2, y: 18, size: 12, font: numberFont });
});
numbered.catalog.delete(P.PDFName.of("Metadata"));
const numberedBytes = await numbered.save({ useObjectStreams: true });
assert.equal((await P.PDFDocument.load(numberedBytes, { updateMetadata: false })).getPageCount(), 4);

// Metadata: delete the exact document-info keys and XMP entry used by the browser tool.
const cleaned = await P.PDFDocument.load(sampleBytes, { updateMetadata: false });
const infoRef = cleaned.context.trailerInfo.Info;
const info = infoRef ? cleaned.context.lookup(infoRef) : null;
["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate", "Trapped"].forEach((key) => {
  if (info && typeof info.has === "function" && info.has(P.PDFName.of(key))) info.delete(P.PDFName.of(key));
});
if (cleaned.catalog.has(P.PDFName.of("Metadata"))) cleaned.catalog.delete(P.PDFName.of("Metadata"));
const cleanedReloaded = await P.PDFDocument.load(await cleaned.save({ useObjectStreams: true, addDefaultPage: false }), { updateMetadata: false });
assert.equal(cleanedReloaded.getTitle(), undefined);
assert.equal(cleanedReloaded.getAuthor(), undefined);
assert.equal(cleanedReloaded.catalog.has(P.PDFName.of("Metadata")), false);

// Crop: convert a 10 mm margin to points and verify the resulting box after save/reload.
const cropped = await P.PDFDocument.load(sampleBytes, { updateMetadata: false });
const margin = 10 * 72 / 25.4;
const firstBox = cropped.getPage(0).getCropBox();
cropped.getPage(0).setCropBox(firstBox.x + margin, firstBox.y + margin, firstBox.width - margin * 2, firstBox.height - margin * 2);
const croppedReloaded = await P.PDFDocument.load(await cropped.save(), { updateMetadata: false });
assert.ok(Math.abs(croppedReloaded.getPage(0).getCropBox().width - (401 - margin * 2)) < 0.01);

// PDF.js: confirm the self-hosted parser extracts both source text and added numbers.
if (typeof globalThis.DOMMatrix === "undefined") globalThis.DOMMatrix = class DOMMatrix {};
if (typeof globalThis.ImageData === "undefined") globalThis.ImageData = class ImageData {};
if (typeof globalThis.Path2D === "undefined") globalThis.Path2D = class Path2D {};
if (typeof Uint8Array.prototype.toHex !== "function") Object.defineProperty(Uint8Array.prototype, "toHex", { value() { return Array.prototype.map.call(this, (byte) => byte.toString(16).padStart(2, "0")).join(""); } });
const pdfjs = await import(pathToFileURL(path.join(root, "assets/vendor/pdfjs/pdf.min.mjs")).href);
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(root, "assets/vendor/pdfjs/pdf.worker.min.mjs")).href;
const loadingTask = pdfjs.getDocument({ data: new Uint8Array(numberedBytes), disableWorker: true, isEvalSupported: false });
const parsed = await loadingTask.promise;
const pageOne = await parsed.getPage(1);
const text = (await pageOne.getTextContent()).items.map((item) => item.str).join(" ");
assert.match(text, /SOURCE PAGE 1/);
assert.match(text, /7/);
await loadingTask.destroy();

console.log("PDF operation tests passed: organize, number, metadata, crop and text extraction.");
