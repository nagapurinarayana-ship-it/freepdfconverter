import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { indexablePages, supplementalPages, pagePathname } from "./site-config.mjs";
import { allLocalizedPaths } from "./localized-content.mjs";

const dist = path.join(process.cwd(), "dist");
const SITE = String(process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/+$/, "");
let failed = false;
const titles = new Map();

function fail(message) {
  failed = true;
  console.error("FAIL " + message);
}

function localPath(relative) {
  return path.join(dist, relative);
}

function schemaTypes(html, file) {
  const types = [];
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.["@type"]) types.push(parsed["@type"]);
      if (Array.isArray(parsed?.["@graph"])) {
        for (const item of parsed["@graph"]) if (item?.["@type"]) types.push(item["@type"]);
      }
    } catch (error) {
      fail(file + ": invalid JSON-LD (" + error.message + ")");
    }
  }
  return types;
}

function checkPage(relative, expectedUrl, localized = false) {
  const file = localPath(relative);
  if (!requireFile(file)) return;
  const html = readFileSync(file);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const description = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]?.trim() || "";
  const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
  const robots = html.match(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1] || "";
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!title) fail(relative + ": missing title");
  if (!description) fail(relative + ": missing meta description");
  if (canonical !== expectedUrl) fail(relative + ": canonical mismatch; expected " + expectedUrl + ", got " + (canonical || "(missing)"));
  if (h1Count !== 1) fail(relative + ": expected exactly one H1");
  if (!/index/i.test(robots) || !/follow/i.test(robots)) fail(relative + ": expected index,follow robots directive");
  if (!/max-image-preview:large/i.test(robots)) fail(relative + ": missing max-image-preview:large");
  if (/<meta\s+name=["']keywords["']/i.test(html)) fail(relative + ": obsolete meta keywords found");
  if (/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) fail(relative + ": indexable page is noindex");

  if (title.length < 25 || title.length > 70) console.warn("WARN " + relative + ": title length " + title.length);
  if (description.length < 70 || description.length > 180) console.warn("WARN " + relative + ": description length " + description.length);

  for (const marker of [
    /property=["']og:title["']/i,
    /property=["']og:description["']/i,
    /property=["']og:url["']/i,
    /property=["']og:image["']/i,
    /name=["']twitter:card["']/i,
    /name=["']twitter:image["']/i
  ]) {
    if (!marker.test(html)) fail(relative + ": incomplete social metadata");
  }

  const types = schemaTypes(html, relative);
  if (!types.includes("WebPage") && !types.includes("CollectionPage")) fail(relative + ": missing WebPage/CollectionPage structured data");
  if (relative.startsWith("tools/") && !types.includes("SoftwareApplication") && !types.includes("WebApplication")) {
    fail(relative + ": tool page missing SoftwareApplication structured data");
  }
  if (relative.startsWith("guides/") && relative !== "guides/index.html" && !types.includes("Article")) {
    fail(relative + ": guide page missing Article structured data");
  }
  if (types.includes("FAQPage")) fail(relative + ": deprecated FAQPage structured data should not be emitted");
  if (/href=["'](?!https?:|mailto:|tel:|#|\/)[^"']*\.html(?:[?#][^"']*)?["']/i.test(html)) {
    fail(relative + ": local internal link still points to a .html duplicate");
  }

  if (localized) {
    for (const lang of ["en", "de", "fr", "es", "x-default"]) {
      if (!html.includes('hreflang="' + lang + '"')) fail(relative + ": missing hreflang " + lang);
    }
  }

  const prior = titles.get(title);
  if (prior && prior !== relative) fail(relative + ": duplicate title also used by " + prior);
  else if (title) titles.set(title, relative);

  console.log("PASS " + relative);
}

function requireFile(file) {
  try {
    require("node:fs").accessSync(file);
    return true;
  } catch {
    fail("missing file " + path.relative(dist, file));
    return false;
  }
}

function readFileSync(file) {
  return require("node:fs").readFileSync(file, "utf8");
}

for (const relative of [...indexablePages, ...supplementalPages]) {
  checkPage(relative, SITE + pagePathname(relative));
}

for (const item of allLocalizedPaths()) {
  const relative = item.path.replace(/^\//, "") + (item.path.endsWith("/") ? "index.html" : ".html");
  checkPage(relative, SITE + item.path, true);
}

const sitemapPath = path.join(dist, "sitemap.xml");
const robotsPath = path.join(dist, "robots.txt");
const sitemap = readFileSync(sitemapPath);
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

if (!sitemapUrls.size) fail("dist/sitemap.xml has no URLs");
if (new Set([...sitemapUrls]).size !== sitemapUrls.size) fail("sitemap contains duplicate URLs");
for (const relative of indexablePages) {
  const url = SITE + pagePathname(relative);
  if (!sitemapUrls.has(url)) fail("sitemap missing " + url);
}
for (const item of allLocalizedPaths()) {
  const url = SITE + item.path;
  if (!sitemapUrls.has(url)) fail("sitemap missing localized URL " + url);
}
for (const url of sitemapUrls) {
  if (!url.startsWith(SITE + "/")) fail("sitemap contains foreign-origin URL " + url);
  if (/\.html(?:$|[?#])/.test(url)) fail("sitemap contains legacy .html URL " + url);
}

const robots = readFileSync(robotsPath);
if (!/User-agent:\s*\*/i.test(robots)) fail("robots.txt missing User-agent *");
if (!/Allow:\s*\//i.test(robots)) fail("robots.txt missing Allow: /");
if (!robots.includes("Sitemap: " + SITE + "/sitemap.xml")) fail("robots.txt does not point to production sitemap");

for (const relative of ["404.html", "offline.html"]) {
  const file = localPath(relative);
  try {
    const html = readFileSync(file);
    if (!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) fail(relative + " must be noindex");
  } catch {}
}

if (failed) process.exit(1);
console.log("FreePDF SEO audit passed for " + sitemapUrls.size + " sitemap URLs.");
