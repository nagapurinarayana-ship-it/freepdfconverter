import { readFile } from "node:fs/promises";
import path from "node:path";
import { indexablePages, pagePathname } from "./site-config.mjs";

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
  if (!html.includes('<meta name="twitter:card" content="summary">')) failures.push(relative + " -> missing Twitter card metadata");
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch { failures.push(relative + " -> invalid JSON-LD"); }
  }
  if (relative === "index.html" && !html.includes('"@type":"WebSite"')) failures.push(relative + " -> missing WebSite structured data");
  if (relative !== "index.html" && !html.includes('"@type":"BreadcrumbList"')) failures.push(relative + " -> missing breadcrumb structured data");
  if (relative.startsWith("guides/") && relative !== "guides/index.html" && !html.includes('"@type":"Article"')) failures.push(relative + " -> missing Article structured data");
  const localHtmlLinks = [...html.matchAll(/href="(?!https?:)([^"]+\.html(?:[?#][^"]*)?)"/g)].map((match) => match[1]);
  if (localHtmlLinks.length) failures.push(relative + " -> redirecting .html links: " + localHtmlLinks.join(", "));
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedLocations = indexablePages.map((relative) => origin + pagePathname(relative));
if (JSON.stringify(locations) !== JSON.stringify(expectedLocations)) failures.push("sitemap.xml -> URL set does not match indexable pages");
if (locations.some((location) => location.endsWith(".html"))) failures.push("sitemap.xml -> contains redirecting .html URL");

if (failures.length) {
  console.error("Production SEO checks failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Production SEO checks passed for " + indexablePages.length + " indexable URLs.");
