import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { articlePages, indexablePages, pageDates, pagePathname } from "./site-config.mjs";
import { allLocalizedPaths, englishPath } from "./localized-content.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const origin = "https://freepdfconverter-all-in-one.pages.dev";
const failures = [];
const guidesWithMatchingTools = new Set([
  "guides/merge-pdf-safely.html",
  "guides/split-extract-pdf-pages.html",
  "guides/unlock-password-protected-pdf.html",
  "guides/password-protect-pdf.html",
  "guides/rotate-pdf-pages.html",
  "guides/jpg-png-to-pdf.html",
  "guides/pdf-to-jpg-vs-png.html",
  "guides/watermark-pdf-documents.html",
  "guides/organize-pdf-pages.html",
  "guides/add-page-numbers-to-pdf.html",
  "guides/remove-pdf-metadata.html",
  "guides/crop-pdf-pages.html",
  "guides/extract-text-from-pdf.html"
]);

for (const relative of indexablePages) {
  const html = await readFile(path.join(dist, relative), "utf8");
  const expectedCanonical = origin + pagePathname(relative);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/i)?.[1];
  if (canonical !== expectedCanonical) failures.push(relative + " -> unexpected canonical " + canonical);
  if (!html.includes('<meta property="og:url" content="' + expectedCanonical + '">')) failures.push(relative + " -> missing og:url");
  if (!html.includes('<meta name="twitter:card" content="summary_large_image">')) failures.push(relative + " -> missing large Twitter card metadata");
  if (!html.includes('<meta property="og:image" content="' + origin + '/assets/images/freepdf-tools-social.jpg">')) failures.push(relative + " -> missing social image metadata");

  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim() || "";
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (!title) failures.push(relative + " -> missing title");
  if (title.length > 70) failures.push(relative + " -> title is unusually long (" + title.length + " chars)");
  if (!description) failures.push(relative + " -> missing meta description");
  if (description.length > 180) failures.push(relative + " -> meta description is unusually long (" + description.length + " chars)");
  if (h1Count !== 1) failures.push(relative + " -> expected exactly one H1, found " + h1Count);

  const adMarkerIndex = html.indexOf("<!-- freepdf-effectivecpm:start -->");
  const h1Index = html.search(/<h1\b/i);
  if (adMarkerIndex === -1) failures.push(relative + " -> missing managed advertisement block");
  if (adMarkerIndex !== -1 && h1Index !== -1 && adMarkerIndex < h1Index) failures.push(relative + " -> advertisement block appears before primary H1 content");

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch { failures.push(relative + " -> invalid JSON-LD"); }
  }
  if (relative === "index.html" && !html.includes('"@type":"WebSite"')) failures.push(relative + " -> missing WebSite structured data");
  if (relative !== "index.html" && !html.includes('"@type":"BreadcrumbList"')) failures.push(relative + " -> missing breadcrumb structured data");
  if (relative.startsWith("guides/") && relative !== "guides/index.html" && !html.includes('"@type":"Article"')) failures.push(relative + " -> missing Article structured data");
  if (articlePages.has(relative) && !html.includes('"image":["' + origin + '/assets/images/freepdf-tools-social.jpg"]')) failures.push(relative + " -> Article structured data missing image");

  const crawlableInternalLinks = [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => !/^(?:https?:|mailto:|tel:|data:|#|javascript:)/i.test(href));
  if (!crawlableInternalLinks.length) failures.push(relative + " -> no crawlable internal links found");
  if (crawlableInternalLinks.some((href) => /\.html(?:[?#]|$)/i.test(href))) failures.push(relative + " -> redirecting .html link remains: " + crawlableInternalLinks.filter((href) => /\.html(?:[?#]|$)/i.test(href)).join(", "));

  if (relative.startsWith("guides/") && relative !== "guides/index.html") {
    if (!html.includes("freepdf-guide-links:start")) failures.push(relative + " -> missing related guide links block");
    if (guidesWithMatchingTools.has(relative) && !html.includes("freepdf-internal-links:start")) failures.push(relative + " -> missing matching tool link block");
  }
  if (relative.startsWith("tools/") && !html.includes("freepdf-internal-links:start")) failures.push(relative + " -> missing tool-guide link block");
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const localizedItems = allLocalizedPaths();
const localizedPageDate = (key) => pageDates[key === "home" ? "index.html" : (itemEnglishPath(key) + ".html")];
function itemEnglishPath(key) { return englishPath(key).replace(/^\//, ""); }
const expectedLocations = [
  ...indexablePages.map((relative) => origin + pagePathname(relative)),
  ...localizedItems.map((item) => origin + item.path)
];
if (JSON.stringify(locations) !== JSON.stringify(expectedLocations)) failures.push("sitemap.xml -> URL set does not match indexable pages");
if (locations.some((location) => location.endsWith(".html"))) failures.push("sitemap.xml -> contains redirecting .html URL");
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
const expectedLastmods = [
  ...indexablePages.map((relative) => pageDates[relative]),
  ...localizedItems.map((item) => localizedPageDate(item.key))
];
if (JSON.stringify(lastmods) !== JSON.stringify(expectedLastmods)) failures.push("sitemap.xml -> lastmod set does not match page dates");

const home = await readFile(path.join(dist, "index.html"), "utf8");
if (!/assets\/css\/styles\.[a-f0-9]{10}\.css/.test(home)) failures.push("build -> stylesheet is not fingerprinted");
if (!/assets\/js\/common\.[a-f0-9]{10}\.js/.test(home)) failures.push("build -> common script is not fingerprinted");
if (/assets\/css\/styles\.css|assets\/js\/common\.js/.test(home)) failures.push("build -> unfingerprinted core asset reference remains");

const wordPage = await readFile(path.join(dist, "tools/word-to-pdf.html"), "utf8");
if (!wordPage.includes(".doc") || !wordPage.includes(".docx")) failures.push("Word converter -> both legacy .doc and modern .docx inputs are not advertised");
if (!wordPage.includes("Microsoft Word 97–2003")) failures.push("Word converter -> legacy Word 97-2003 support is missing");

const coreAssets = await readdir(path.join(dist, "assets/js/core"));
if (coreAssets.some((file) => /\.[a-f0-9]{10}\.(?:js|mjs)$/.test(file))) failures.push("build -> shared ESM core modules must remain at stable URLs");
for (const coreFile of ["tool-controller.js", "image-tool-kit.js", "image-form-engine.js", "image-form-policy.js"]) {
  if (!coreAssets.includes(coreFile)) failures.push("build -> stable shared ESM core module is missing: " + coreFile);
}
const jsAssets = await readdir(path.join(dist, "assets/js"));
const wordJsAsset = jsAssets.find((file) => /^word-to-pdf\.[a-f0-9]{10}\.js$/.test(file));
if (!wordJsAsset) failures.push("Word converter -> fingerprinted word-to-pdf script is missing");
if (wordJsAsset) {
  const wordJsSource = await readFile(path.join(dist, "assets/js", wordJsAsset), "utf8");
  if (!wordJsSource.includes("getMsDocParser")) failures.push("Word converter -> legacy DOC parser loader is missing");
  if (!wordJsSource.includes(".doc") || !wordJsSource.includes(".docx")) failures.push("Word converter -> legacy and modern Word branches are missing");
  if (!wordJsSource.includes("/assets/vendor/docjs/index.js")) failures.push("Word converter -> stable self-hosted MS-DOC parser path is missing");
  if (/assets\/vendor\/docjs\/index\.[a-f0-9]{10}\.js/.test(wordJsSource)) failures.push("Word converter -> MS-DOC parser entry point was incorrectly fingerprinted");
}
const photoPage = await readFile(path.join(dist, "tools/photo-compressor.html"), "utf8");
if (!photoPage.includes('multiple') || !photoPage.includes('10 KB') || !photoPage.includes('customTarget') || !photoPage.includes('Millimetres') || !photoPage.includes('Centimetres')) {
  failures.push("Photo Compressor -> batch, target presets or physical-dimension workflow is incomplete");
}
if (/JSZip|\.zip|ZIP/i.test(photoPage)) failures.push("Photo Compressor -> ZIP output reference remains");
const toolJsAssets = await readdir(path.join(dist, "assets/js/tools"));
const photoToolAsset = toolJsAssets.find((file) => /^photo-compressor\.tool\.[a-f0-9]{10}\.js$/.test(file));
const signatureToolAsset = toolJsAssets.find((file) => /^signature-resizer\.tool\.[a-f0-9]{10}\.js$/.test(file));
if (!photoToolAsset) failures.push("Photo Compressor -> fingerprinted tool module is missing");
if (photoToolAsset) {
  const photoToolSource = await readFile(path.join(dist, "assets/js/tools", photoToolAsset), "utf8");
  if (!photoToolSource.includes("ToolController") || !photoToolSource.includes("multiple: true")) failures.push("Photo Compressor -> shared multi-file controller integration is missing");
  if (!photoToolSource.includes("downloadBlob") || !photoToolSource.includes("image-form-policy")) failures.push("Photo Compressor -> direct download or shared policy integration is missing");
  if (/JSZip|\.zip|ZIP|archive-engine|createZipBlob/i.test(photoToolSource)) failures.push("Photo Compressor -> ZIP/archive output code remains");
}
const thumbPage = await readFile(path.join(dist, "tools/thumb-impression-resizer.html"), "utf8");
if (!thumbPage.includes('300 × 300 px') || !thumbPage.includes('600 × 600 px') || !thumbPage.includes('Auto-crop extra whitespace') || !thumbPage.includes('custom')) {
  failures.push("Thumb Impression Resizer -> presets, cleanup or custom-size workflow is incomplete");
}
if (!thumbPage.includes("assets/js/tools/thumb-impression-resizer.entry.js")) failures.push("Thumb Impression Resizer -> direct entry script is missing");
if (/\bZIP\b/i.test(thumbPage) || /\.zip\b/i.test(thumbPage)) failures.push("Thumb Impression Resizer -> ZIP output reference remains");
const thumbToolAsset = toolJsAssets.find((file) => /^thumb-impression-resizer\.tool\.[a-f0-9]{10}\.js$/.test(file));
if (!thumbToolAsset) failures.push("Thumb Impression Resizer -> fingerprinted tool module is missing");
if (thumbToolAsset) {
  const thumbToolSource = await readFile(path.join(dist, "assets/js/tools", thumbToolAsset), "utf8");
  if (!thumbToolSource.includes("encodeBestUnderTarget") || !thumbToolSource.includes("trimWhitespace") || !thumbToolSource.includes("downloadBlob")) failures.push("Thumb Impression Resizer -> shared encoder, cleanup or direct-download integration is missing");
  if (/\.zip\b/i.test(thumbToolSource)) failures.push("Thumb Impression Resizer -> ZIP archive output code remains");
}
const passportPage = await readFile(path.join(dist, "tools/passport-id-photo-maker.html"), "utf8");
if (!passportPage.includes('35 × 45 mm') || !passportPage.includes('2 × 2 in') || !passportPage.includes('focusY') || !passportPage.includes('custom')) {
  failures.push("Passport & ID Photo Maker -> preset, custom-size or framing workflow is incomplete");
}
if (!passportPage.includes("assets/js/tools/passport-id-photo-maker.entry.js")) failures.push("Passport & ID Photo Maker -> direct entry script is missing");
if (/\bZIP\b/i.test(passportPage) || /\.zip\b/i.test(passportPage)) failures.push("Passport & ID Photo Maker -> ZIP output reference remains");
const passportToolAsset = toolJsAssets.find((file) => /^passport-id-photo-maker\.tool\.[a-f0-9]{10}\.js$/.test(file));
if (!passportToolAsset) failures.push("Passport & ID Photo Maker -> fingerprinted tool module is missing");
if (passportToolAsset) {
  const passportToolSource = await readFile(path.join(dist, "assets/js/tools", passportToolAsset), "utf8");
  if (!passportToolSource.includes("encodeBestUnderTarget") || !passportToolSource.includes("cropFocusY") || !passportToolSource.includes("downloadBlob")) failures.push("Passport & ID Photo Maker -> shared encoder, framing or direct-download integration is missing");
  if (/\.zip\b/i.test(passportToolSource)) failures.push("Passport & ID Photo Maker -> ZIP archive output code remains");
}
const signaturePage = await readFile(path.join(dist, "tools/signature-resizer.html"), "utf8");
if (!signaturePage.includes('multiple') || !signaturePage.includes('10 KB') || !signaturePage.includes('customTarget') || !signaturePage.includes('autoTrim') || !signaturePage.includes('Millimetres')) {
  failures.push("Signature Resizer -> batch, target-size, auto-crop or dimension workflow is incomplete");
}
if (/JSZip|\.zip|ZIP/i.test(signaturePage)) failures.push("Signature Resizer -> ZIP output reference remains");
if (signatureToolAsset) {
  const signatureToolSource = await readFile(path.join(dist, "assets/js/tools", signatureToolAsset), "utf8");
  if (!signatureToolSource.includes("ToolController") || !signatureToolSource.includes("multiple: true")) failures.push("Signature Resizer -> shared multi-file controller integration is missing");
  if (!signatureToolSource.includes("downloadBlob") || !signatureToolSource.includes("trimWhitespace")) failures.push("Signature Resizer -> direct download or whitespace-cleanup engine is missing");
  if (/JSZip|\.zip|ZIP|archive-engine|createZipBlob/i.test(signatureToolSource)) failures.push("Signature Resizer -> ZIP/archive output code remains");
}
if (!photoToolAsset) failures.push("Photo Compressor -> fingerprinted photo tool module is missing");
if (!toolJsAssets.some((file) => /photo-compressor\.tool\.[a-f0-9]{10}\.js$/.test(file))) failures.push("Image tools -> fingerprinted photo tool module is missing");

const handwrittenPage = await readFile(path.join(dist, "tools/handwritten-declaration-resizer.html"), "utf8");
if (!handwrittenPage.includes('10 KB') || !handwrittenPage.includes('50 KB') || !handwrittenPage.includes('100 KB') || !handwrittenPage.includes('customTarget') || !handwrittenPage.includes('Auto-crop extra whitespace') || !handwrittenPage.includes('Millimetres')) {
  failures.push("Handwritten Declaration Resizer -> target sizes, cleanup or dimension workflow is incomplete");
}
if (!handwrittenPage.includes("assets/js/tools/handwritten-declaration-resizer.entry.js")) failures.push("Handwritten Declaration Resizer -> direct entry script is missing");
if (/\bZIP\b/i.test(handwrittenPage) || /\.zip\b/i.test(handwrittenPage)) failures.push("Handwritten Declaration Resizer -> ZIP output reference remains");
const handwrittenToolAsset = toolJsAssets.find((file) => /^handwritten-declaration-resizer\.tool\.[a-f0-9]{10}\.js$/.test(file));
if (!handwrittenToolAsset) failures.push("Handwritten Declaration Resizer -> fingerprinted tool module is missing");
if (handwrittenToolAsset) {
  const handwrittenToolSource = await readFile(path.join(dist, "assets/js/tools", handwrittenToolAsset), "utf8");
  if (!handwrittenToolSource.includes("ToolController") || !handwrittenToolSource.includes("multiple: true")) failures.push("Handwritten Declaration Resizer -> shared multi-file controller integration is missing");
  if (!handwrittenToolSource.includes("encodeBestUnderTarget") || !handwrittenToolSource.includes("trimWhitespace") || !handwrittenToolSource.includes("downloadBlob")) failures.push("Handwritten Declaration Resizer -> shared encoder, cleanup or direct-download integration is missing");
  if (/\.zip\b/i.test(handwrittenToolSource)) failures.push("Handwritten Declaration Resizer -> ZIP archive output code remains");
}

const directDownloadPages = [
  ["tools/photo-compressor.html", "Photo Compressor"],
  ["tools/signature-resizer.html", "Signature Resizer"],
  ["tools/split-pdf.html", "Split PDF"],
  ["tools/pdf-to-image.html", "PDF to Image"],
  ["tools/passport-id-photo-maker.html", "Passport & ID Photo Maker"],
  ["tools/handwritten-declaration-resizer.html", "Handwritten Declaration Resizer"]
];
for (const [relative, label] of directDownloadPages) {
  const html = await readFile(path.join(dist, relative), "utf8");
  if (/\bZIP\b/i.test(html) || /\.zip\b/i.test(html)) failures.push(relative + " -> " + label + " still exposes ZIP output");
}
const splitJsAsset = jsAssets.find((file) => /^split-pdf\.[a-f0-9]{10}\.js$/.test(file));
const pdfToImageJsAsset = jsAssets.find((file) => /^pdf-to-image\.[a-f0-9]{10}\.js$/.test(file));
if (!splitJsAsset) failures.push("Split PDF -> fingerprinted browser script is missing");
if (!pdfToImageJsAsset) failures.push("PDF to Image -> fingerprinted browser script is missing");
const sourceDownloadPolicyFiles = [
  ["assets/js/split-pdf.js", "Split PDF"],
  ["assets/js/pdf-to-image.js", "PDF to Image"]
];
for (const [relative, label] of sourceDownloadPolicyFiles) {
  const source = await readFile(path.join(root, relative), "utf8");
  if (/\.zip\b/i.test(source)) failures.push(label + " -> ZIP archive output code remains");
}
const photoJs = photoToolAsset ? await readFile(path.join(dist, "assets/js/tools", photoToolAsset), "utf8") : "";
const signatureJs = signatureToolAsset ? await readFile(path.join(dist, "assets/js/tools", signatureToolAsset), "utf8") : "";
for (const [source, label] of [[photoJs, "Photo Compressor"], [signatureJs, "Signature Resizer"]]) {
  if (/\.zip\b/i.test(source)) failures.push(label + " -> ZIP archive output code remains");
}
const compressPage = await readFile(path.join(dist, "tools/compress-pdf.html"), "utf8");
if (!compressPage.includes("Compress PDF") || !compressPage.includes("lossless")) failures.push("Compress PDF -> tool page is missing core compression copy");
if (!/assets\/js\/compress-pdf\.[a-f0-9]{10}\.js/.test(compressPage)) failures.push("Compress PDF -> fingerprinted browser script reference is missing");
const compressJsAsset = jsAssets.find((file) => /^compress-pdf\.[a-f0-9]{10}\.js$/.test(file));
if (!compressJsAsset) failures.push("Compress PDF -> fingerprinted browser script is missing");
if (compressJsAsset) {
  const compressJsSource = await readFile(path.join(dist, "assets/js", compressJsAsset), "utf8");
  if (!/\/assets\/js\/compress-pdf-worker\.[a-f0-9]{10}\.js/.test(compressJsSource)) failures.push("Compress PDF -> fingerprinted worker reference is missing");
  if (!compressJsSource.includes("compressed.pdf")) failures.push("Compress PDF -> compressed output filename is missing");
}
const compressWorkerAsset = jsAssets.find((file) => /^compress-pdf-worker\.[a-f0-9]{10}\.js$/.test(file));
if (!compressWorkerAsset) failures.push("Compress PDF -> fingerprinted worker asset is missing");
if (compressWorkerAsset) {
  const compressWorker = await readFile(path.join(dist, "assets/js", compressWorkerAsset), "utf8");
  if (!compressWorker.includes("--recompress-flate") || !compressWorker.includes("--object-streams=generate") || !compressWorker.includes("--compression-level=9")) failures.push("Compress PDF -> qpdf lossless compression options are missing");
}

const pdfWordJsAsset = jsAssets.find((file) => /^pdf-to-word\.[a-f0-9]{10}\.js$/.test(file));
if (!pdfWordJsAsset) failures.push("PDF to Word -> fingerprinted converter script is missing");
if (pdfWordJsAsset) {
  const pdfWordSource = await readFile(path.join(dist, "assets/js", pdfWordJsAsset), "utf8");
  if (!pdfWordSource.includes("buildDocx")) failures.push("PDF to Word -> DOCX builder is missing");
  if (!pdfWordSource.includes(".docx")) failures.push("PDF to Word -> modern DOCX output is missing");
  if (!pdfWordSource.includes("ocrLanguage")) failures.push("PDF to Word -> OCR language selector is missing");
  if (!pdfWordSource.includes('eng: "English"') || !pdfWordSource.includes('deu: "Deutsch"') || !pdfWordSource.includes('fra: "Français"') || !pdfWordSource.includes('spa: "Español"')) failures.push("PDF to Word -> four OCR language mappings are missing");
  if (!pdfWordSource.includes("createWorker(language")) failures.push("PDF to Word -> selected OCR language is not passed to Tesseract");
}

const ocrPage = await readFile(path.join(dist, "tools/ocr-pdf.html"), "utf8");
if (!ocrPage.includes("OCR PDF") || !ocrPage.includes("scanned")) failures.push("OCR PDF -> tool page is missing scanned-PDF OCR copy");
if (!/assets\/js\/ocr-pdf\.[a-f0-9]{10}\.js/.test(ocrPage)) failures.push("OCR PDF -> fingerprinted browser script reference is missing");
const ocrJsAsset = jsAssets.find((file) => /^ocr-pdf\.[a-f0-9]{10}\.js$/.test(file));
if (!ocrJsAsset) failures.push("OCR PDF -> fingerprinted browser script is missing");
if (ocrJsAsset) {
  const ocrJsSource = await readFile(path.join(dist, "assets/js", ocrJsAsset), "utf8");
  if (!ocrJsSource.includes("/assets/vendor/tesseract/tesseract.min.js")) failures.push("OCR PDF -> local Tesseract runtime path is missing");
  if (!ocrJsSource.includes("/assets/vendor/tesseract/worker.min.js")) failures.push("OCR PDF -> local Tesseract worker path is missing");
  if (!ocrJsSource.includes("/assets/vendor/tesseract/core")) failures.push("OCR PDF -> local Tesseract core path is missing");
  if (!ocrJsSource.includes("/assets/vendor/tesseract/lang")) failures.push("OCR PDF -> local English language-data path is missing");
  if (!ocrJsSource.includes("-ocr.docx")) failures.push("OCR PDF -> DOCX output filename is missing");
}
for (const file of ["tesseract.min.js","worker.min.js","core/tesseract-core.wasm.js","core/tesseract-core-simd.wasm.js","core/tesseract-core-lstm.wasm.js","core/tesseract-core-simd-lstm.wasm.js","core/tesseract-core-relaxedsimd.wasm.js","core/tesseract-core-relaxedsimd-lstm.wasm.js","lang/eng.traineddata.gz"]) await access(path.join(dist, "assets/vendor/tesseract", file));
if (/assets\/vendor\/tesseract\/.*\.[a-f0-9]{10}\.(?:js|wasm)/.test(ocrPage)) failures.push("OCR PDF -> Tesseract vendor assets must stay at stable paths");
if (!ocrPage.includes('value="eng"') || !ocrPage.includes('value="deu"') || !ocrPage.includes('value="fra"') || !ocrPage.includes('value="spa"')) failures.push("OCR PDF -> four language selector options are missing");

const serviceWorker = await readFile(path.join(dist, "service-worker.js"), "utf8");
if (serviceWorker.includes("__CACHE_VERSION__") || serviceWorker.includes("__PRECACHE_URLS__")) failures.push("service-worker.js -> build placeholders remain");
if (!serviceWorker.includes('"/favicon.ico"')) failures.push("service-worker.js -> root favicon is not precached");
if (!serviceWorker.includes("if (!response.ok) return response;")) failures.push("service-worker.js -> failed navigation responses can be cached");
if (!serviceWorker.includes('caches.match("/offline.html")')) failures.push("service-worker.js -> offline fallback does not include /offline.html");

await access(path.join(dist, "favicon.ico"));
const redirects = await readFile(path.join(dist, "_redirects"), "utf8");
if (!redirects.split(/\r?\n/).includes("/rotate-pdf-pages /tools/rotate-pdf 301")) failures.push("_redirects -> missing legacy rotate-page redirect");

const docjsFiles = await readdir(path.join(dist, "assets/vendor/docjs"));
if (!docjsFiles.includes("index.js")) failures.push("build -> stable MS-DOC parser entry point is missing");
if (!docjsFiles.includes("LICENSE.txt")) failures.push("build -> MS-DOC parser license is missing");
if (!serviceWorker.includes("/assets/vendor/docjs/index.js")) failures.push("service-worker.js -> stable MS-DOC parser entry point is not precached");
const jszipFiles = await readdir(path.join(dist, "assets/vendor/jszip"));
if (!jszipFiles.includes("jszip.min.js")) failures.push("build -> stable JSZip runtime is missing");
if (jszipFiles.some((file) => /^jszip\.[a-f0-9]{10}\.js$/.test(file))) failures.push("build -> JSZip runtime should remain at its stable vendor path");
if (!serviceWorker.includes("/assets/vendor/jszip/jszip.min.js")) failures.push("service-worker.js -> JSZip runtime is not precached");


if (failures.length) {
  console.error("Production SEO/quality checks failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Production SEO/quality checks passed for " + indexablePages.length + " indexable URLs.");
