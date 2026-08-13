import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { indexablePages, supplementalPages, pageDates } from "./site-config.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const origin = String(process.env.SITE_ORIGIN || "").replace(/\/+$/, "");
if (!/^https?:\/\/[^/]+$/i.test(origin)) {
  console.log("Skipped SEO URL normalization: SITE_ORIGIN is not set to a valid production origin");
  process.exit(0);
}

const allPages = [...new Set([...indexablePages, ...supplementalPages])];
const canonicalByFile = new Map(allPages.map((relative) => [relative, canonicalPath(relative)]));
const aliases = new Map();

for (const relative of allPages) {
  const canonical = canonicalPath(relative);
  aliases.set("/" + relative, canonical);
  aliases.set(canonical, canonical);
  const withoutExt = relative.endsWith(".html") ? relative.slice(0, -5) : relative;
  aliases.set("/" + withoutExt, canonical);
  if (relative.endsWith("/index.html")) {
    const dir = "/" + relative.slice(0, -"index.html".length);
    aliases.set(dir.replace(/\/{2,}/g, "/"), canonical);
    aliases.set(dir.replace(/\/$/, ""), canonical);
  }
}

for (const relative of allPages) {
  const file = path.join(dist, relative);
  let html;
  try {
    html = await readFile(file, "utf8");
  } catch {
    continue;
  }

  html = html.replace(/href="([^"]+)"/g, (full, href) => {
    if (/^(?:https?:|mailto:|data:|javascript:|#)/i.test(href)) return full;
    const suffixIndex = href.search(/[?#]/);
    const pathPart = suffixIndex >= 0 ? href.slice(0, suffixIndex) : href;
    const suffix = suffixIndex >= 0 ? href.slice(suffixIndex) : "";
    let resolved;
    try {
      resolved = new URL(pathPart || "", "https://internal.example/" + relative).pathname;
    } catch {
      return full;
    }
    const canonical = aliases.get(resolved);
    return canonical ? 'href="' + canonical + suffix + '"' : full;
  });

  const canonical = canonicalByFile.get(relative);
  if (canonical) {
    const absolute = origin + canonical;
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*">/i, '<link rel="canonical" href="' + absolute + '">');
    html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*">/i, '<meta property="og:url" content="' + absolute + '">');
  }
  await writeFile(file, html, "utf8");
}

const urls = indexablePages
  .map((relative) => '  <url><loc>' + origin + canonicalPath(relative) + '</loc><lastmod>' + (pageDates[relative] || "2026-08-13") + '</lastmod></url>')
  .join("\n");
await writeFile(
  path.join(dist, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n',
  "utf8"
);

const existingRedirects = await readFile(path.join(dist, "_redirects"), "utf8").catch(() => "");
const redirects = new Set(existingRedirects.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
for (const relative of allPages) {
  const canonical = canonicalPath(relative);
  if (relative === "index.html") continue;
  const withoutExt = "/" + relative.slice(0, -5);
  if (withoutExt !== canonical) redirects.add(withoutExt + " " + canonical + " 301");
  if (relative.endsWith("/index.html")) redirects.add("/" + relative + " " + canonical + " 301");
}
await writeFile(path.join(dist, "_redirects"), [...redirects].join("\n") + "\n", "utf8");
console.log("Normalized internal URLs, canonicals, sitemap URLs, and legacy extensionless redirects");

function canonicalPath(relative) {
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return "/" + relative.slice(0, -"index.html".length);
  return "/" + relative;
}
