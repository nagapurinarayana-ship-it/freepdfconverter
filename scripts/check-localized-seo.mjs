import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { PAGE_KEYS, allLocalizedPaths, englishPath, localePagePath } from "./localized-content.mjs";

const dist = path.join(process.cwd(), "dist");
const failures = [];

for (const item of allLocalizedPaths()) {
  const relative = item.path.slice(1) + (item.path.endsWith("/") ? "index.html" : ".html");
  const file = path.join(dist, relative);
  try { await access(file); } catch { failures.push("localized page missing: " + relative); continue; }
  const html = await readFile(file, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || "";
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] || "";
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  if (!title) failures.push(relative + " -> missing title");
  if (!description) failures.push(relative + " -> missing description");
  if (h1 !== 1) failures.push(relative + " -> expected one h1");
  for (const hreflang of ["en","de","fr","es","x-default"]) {
    if (!html.includes('hreflang="' + hreflang + '"')) failures.push(relative + " -> missing hreflang " + hreflang);
  }
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1] || "";
  if (!canonical.endsWith(item.path)) failures.push(relative + " -> canonical mismatch");
  const stylesheet = html.match(/<link\s+rel="stylesheet"\s+href="([^"]+)"/i)?.[1] || "";
  if (!/^\/assets\/css\/styles\.[a-f0-9]{10}\.css$/.test(stylesheet)) failures.push(relative + " -> stylesheet is not fingerprinted");
}

for (const key of PAGE_KEYS) {
  const englishFile = path.join(dist, englishPath(key).slice(1) || "index.html") + (englishPath(key) === "/" ? "" : ".html");
  let file = englishFile;
  if (englishPath(key) === "/") file = path.join(dist, "index.html");
  try {
    const html = await readFile(file, "utf8");
    for (const lang of ["en","de","fr","es","x-default"]) {
      if (!html.includes('hreflang="' + lang + '"')) failures.push("English " + key + " -> missing hreflang " + lang);
    }
  } catch {
    failures.push("English source missing: " + key);
  }
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
for (const item of allLocalizedPaths()) {
  if (!sitemap.includes("<loc>" + process.env.SITE_ORIGIN.replace(/\/$/, "") + item.path + "</loc>")) failures.push("sitemap missing " + item.path);
}

if (failures.length) {
  console.error("Localized SEO checks failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Localized SEO checks passed for " + allLocalizedPaths().length + " localized pages.");
