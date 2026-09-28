import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PAGE_KEYS, allLocalizedPaths, englishPath, localePagePath } from "./localized-content.mjs";
import { pageDates } from "./site-config.mjs";

const dist = path.join(process.cwd(), "dist");
const origin = (process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/$/, "");
const file = path.join(dist, "sitemap.xml");
let existing = "";
try { existing = await readFile(file, "utf8"); } catch {}
const existingUrls = [...existing.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)].map((m) => m[0]);
const seen = new Set(existingUrls.map((u) => u.match(/<loc>([^<]+)<\/loc>/)?.[1]));
const fallbackLastmod = new Date().toISOString().slice(0, 10);
function pageDateForKey(key) {
  const relative = key === "home" ? "index.html" : englishPath(key).replace(/^\//, "") + ".html";
  return pageDates[relative] || fallbackLastmod;
}

const blocks = existingUrls.slice();
for (const item of allLocalizedPaths()) {
  const url = origin + item.path;
  if (seen.has(url)) continue;
  const variants = [
    ["en", origin + englishPath(item.key)],
    ["de", origin + localePagePath("de", item.key)],
    ["fr", origin + localePagePath("fr", item.key)],
    ["es", origin + localePagePath("es", item.key)]
  ];
  const links = variants.map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join("");
  const self = `<url><loc>${url}</loc><lastmod>${pageDateForKey(item.key)}</lastmod>${links}</url>`;
  blocks.push(self);
}
for (const blockIndex of blocks.keys()) {
  const block = blocks[blockIndex];
  if (!/<xhtml:link/.test(block)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) continue;
    const matched = PAGE_KEYS.find((key) => origin + englishPath(key) === loc);
    if (matched) {
      const variants = [
        ["en", origin + englishPath(matched)],
        ["de", origin + localePagePath("de", matched)],
        ["fr", origin + localePagePath("fr", matched)],
        ["es", origin + localePagePath("es", matched)]
      ];
      blocks[blockIndex] = block.replace("</url>", variants.map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join("") + "</url>");
    }
  }
}
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + blocks.join("\n") + "\n</urlset>\n";
await writeFile(file, xml, "utf8");
console.log("Added localized pages and hreflang alternates to sitemap.xml.");
