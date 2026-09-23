import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { articlePages, indexablePages, pageDates, pagePathname } from "./site-config.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const origin = "https://freepdfconverter-all-in-one.pages.dev";
const failures = [];
const guidesWithMatchingTools = new Set([
  "guides/merge-pdf-safely.html",
  "guides/split-extract-pdf-pages.html",
  "guides/unlock-password-protected-pdf.html",
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
const expectedLocations = indexablePages.map((relative) => origin + pagePathname(relative));
if (JSON.stringify(locations) !== JSON.stringify(expectedLocations)) failures.push("sitemap.xml -> URL set does not match indexable pages");
if (locations.some((location) => location.endsWith(".html"))) failures.push("sitemap.xml -> contains redirecting .html URL");
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
const expectedLastmods = indexablePages.map((relative) => pageDates[relative]);
if (JSON.stringify(lastmods) !== JSON.stringify(expectedLastmods)) failures.push("sitemap.xml -> lastmod set does not match page dates");

const home = await readFile(path.join(dist, "index.html"), "utf8");
if (!/assets\/css\/styles\.[a-f0-9]{10}\.css/.test(home)) failures.push("build -> stylesheet is not fingerprinted");
if (!/assets\/js\/common\.[a-f0-9]{10}\.js/.test(home)) failures.push("build -> common script is not fingerprinted");
if (/assets\/css\/styles\.css|assets\/js\/common\.js/.test(home)) failures.push("build -> unfingerprinted core asset reference remains");

const wordPage = await readFile(path.join(dist, "tools/word-to-pdf.html"), "utf8");
if (!wordPage.includes(".doc") || !wordPage.includes(".docx")) failures.push("Word converter -> both legacy .doc and modern .docx inputs are not advertised");
if (!wordPage.includes("Microsoft Word 97–2003")) failures.push("Word converter -> legacy Word 97-2003 support is missing");

const jsAssets = await readdir(path.join(dist, "assets/js"));
const wordJsAsset = jsAssets.find((file) => /^word-to-pdf\.[a-f0-9]{10}\.js$/.test(file));
if (!wordJsAsset) failures.push("Word converter -> fingerprinted word-to-pdf script is missing");
if (wordJsAsset) {
  const wordJsSource = await readFile(path.join(dist, "assets/js", wordJsAsset), "utf8");
  if (!wordJsSource.includes("getMsDocParser")) failures.push("Word converter -> legacy DOC parser loader is missing");
  if (!wordJsSource.includes(".doc") || !wordJsSource.includes(".docx")) failures.push("Word converter -> legacy and modern Word branches are missing");
  if (!wordJsSource.includes("/assets/vendor/docjs/index.js")) failures.push("Word converter -> stable self-hosted MS-DOC parser path is missing");
  if (wordJsSource.includes("assets/vendor/docjs/index.")) failures.push("Word converter -> MS-DOC parser entry point was incorrectly fingerprinted");
}
const pdfWordJsAsset = jsAssets.find((file) => /^pdf-to-word\.[a-f0-9]{10}\.js$/.test(file));
if (!pdfWordJsAsset) failures.push("PDF to Word -> fingerprinted converter script is missing");
if (pdfWordJsAsset) {
  const pdfWordSource = await readFile(path.join(dist, "assets/js", pdfWordJsAsset), "utf8");
  if (!pdfWordSource.includes("buildDocx")) failures.push("PDF to Word -> DOCX builder is missing");
  if (!pdfWordSource.includes(".docx")) failures.push("PDF to Word -> modern DOCX output is missing");
}

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

const qpdfFiles = await readdir(path.join(dist, "assets/vendor/qpdf"));
const qpdfScript = qpdfFiles.find((file) => /^qpdf\.[a-f0-9]{10}\.js$/.test(file));
const qpdfWasm = qpdfFiles.find((file) => /^qpdf\.[a-f0-9]{10}\.wasm$/.test(file));
if (!qpdfScript) failures.push("build -> qpdf script is not fingerprinted");
if (!qpdfWasm) failures.push("build -> qpdf WebAssembly is not fingerprinted");
if (qpdfFiles.includes("qpdf.js") || qpdfFiles.includes("qpdf.wasm")) failures.push("build -> unfingerprinted qpdf runtime remains");
if (qpdfScript && !serviceWorker.includes("/assets/vendor/qpdf/" + qpdfScript)) failures.push("service-worker.js -> fingerprinted qpdf script is not precached");
if (qpdfWasm && !serviceWorker.includes("/assets/vendor/qpdf/" + qpdfWasm)) failures.push("service-worker.js -> fingerprinted qpdf WebAssembly is not precached");

if (failures.length) {
  console.error("Production SEO/quality checks failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Production SEO/quality checks passed for " + indexablePages.length + " indexable URLs.");
