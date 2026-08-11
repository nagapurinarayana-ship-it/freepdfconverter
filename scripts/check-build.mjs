import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { articlePages, indexablePages, pageDates, pagePathname } from "./site-config.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const origin = "https://freepdfconverter-all-in-one.pages.dev";
const failures = [];

for (const relative of indexablePages) {
  const html = await readFile(path.join(dist, relative), "utf8");
  const expectedCanonical = origin + pagePathname(relative);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/i)?.[1];
  if (canonical !== expectedCanonical) failures.push(relative + " -> unexpected canonical " + canonical);
  if (!html.includes('<meta property="og:url" content="' + expectedCanonical + '">')) failures.push(relative + " -> missing og:url");
  if (!html.includes('<meta name="twitter:card" content="summary_large_image">')) failures.push(relative + " -> missing large Twitter card metadata");
  if (!html.includes('<meta property="og:image" content="' + origin + '/assets/images/freepdf-tools-social.jpg">')) failures.push(relative + " -> missing social image metadata");
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch { failures.push(relative + " -> invalid JSON-LD"); }
  }
  if (relative === "index.html" && !html.includes('"@type":"WebSite"')) failures.push(relative + " -> missing WebSite structured data");
  if (relative !== "index.html" && !html.includes('"@type":"BreadcrumbList"')) failures.push(relative + " -> missing breadcrumb structured data");
  if (relative.startsWith("guides/") && relative !== "guides/index.html" && !html.includes('"@type":"Article"')) failures.push(relative + " -> missing Article structured data");
  if (articlePages.has(relative) && !html.includes('"image":["' + origin + '/assets/images/freepdf-tools-social.jpg"]')) failures.push(relative + " -> Article structured data missing image");
  const localHtmlLinks = [...html.matchAll(/href="(?!https?:)([^"]+\.html(?:[?#][^"]*)?)"/g)].map((match) => match[1]);
  if (localHtmlLinks.length) failures.push(relative + " -> redirecting .html links: " + localHtmlLinks.join(", "));
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

const serviceWorker = await readFile(path.join(dist, "service-worker.js"), "utf8");
if (serviceWorker.includes("__CACHE_VERSION__") || serviceWorker.includes("__PRECACHE_URLS__")) failures.push("service-worker.js -> build placeholders remain");
if (!serviceWorker.includes('"/favicon.ico"')) failures.push("service-worker.js -> root favicon is not precached");

await access(path.join(dist, "favicon.ico"));
const redirects = await readFile(path.join(dist, "_redirects"), "utf8");
if (!redirects.split(/\r?\n/).includes("/rotate-pdf-pages /tools/rotate-pdf 301")) failures.push("_redirects -> missing legacy rotate-page redirect");

const qpdfFiles = await readdir(path.join(dist, "assets/vendor/qpdf"));
const qpdfScript = qpdfFiles.find((file) => /^qpdf\.[a-f0-9]{10}\.js$/.test(file));
const qpdfWasm = qpdfFiles.find((file) => /^qpdf\.[a-f0-9]{10}\.wasm$/.test(file));
if (!qpdfScript) failures.push("build -> qpdf script is not fingerprinted");
if (!qpdfWasm) failures.push("build -> qpdf WebAssembly is not fingerprinted");
if (qpdfFiles.includes("qpdf.js") || qpdfFiles.includes("qpdf.wasm")) failures.push("build -> unfingerprinted qpdf runtime remains");
if (qpdfScript && !serviceWorker.includes("/assets/vendor/qpdf/" + qpdfScript)) failures.push("service-worker.js -> fingerprinted qpdf script is not precached");
if (qpdfWasm && !serviceWorker.includes("/assets/vendor/qpdf/" + qpdfWasm)) failures.push("service-worker.js -> fingerprinted qpdf WebAssembly is not precached");

if (failures.length) {
  console.error("Production SEO checks failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Production SEO checks passed for " + indexablePages.length + " indexable URLs.");
