import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOCALES, PAGE_KEYS, allLocalizedPaths, englishPath, localePagePath } from "./localized-content.mjs";

const dist = path.join(process.cwd(), "dist");
const origin = (process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/$/, "");

const groups = Object.fromEntries(PAGE_KEYS.map((key) => {
  const variants = {
    en: origin + englishPath(key),
    de: origin + localePagePath("de", key),
    fr: origin + localePagePath("fr", key),
    es: origin + localePagePath("es", key),
    "x-default": origin + englishPath(key)
  };
  return [key, variants];
}));

const targets = [];
for (const key of PAGE_KEYS) targets.push({ file: englishPath(key), key });
for (const item of allLocalizedPaths()) targets.push({ file: item.path, key: item.key });

for (const target of targets) {
  const file = path.join(dist, target.file.replace(/^\//, "")) + (target.file.endsWith("/") ? "index.html" : ".html");
  let html;
  try { html = await readFile(file, "utf8"); } catch { continue; }
  html = html.replace(/\s*<!-- freepdf-hreflang:start -->[\s\S]*?<!-- freepdf-hreflang:end -->/g, "");
  const group = groups[target.key];
  const tags = [
    ["en", group.en],
    ["de", group.de],
    ["fr", group.fr],
    ["es", group.es],
    ["x-default", group["x-default"]]
  ].map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}">`).join("\n");
  html = html.replace("</head>", "<!-- freepdf-hreflang:start -->\n" + tags + "\n<!-- freepdf-hreflang:end -->\n</head>");
  await writeFile(file, html, "utf8");
}

console.log("Injected bidirectional hreflang annotations for EN/DE/FR/ES page clusters.");
