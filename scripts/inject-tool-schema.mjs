import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const toolsDir = path.join(dist, "tools");
const suppliedOrigin = String(process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/+$/, "");
const origin = /^https?:\/\/[^/]+$/i.test(suppliedOrigin) ? suppliedOrigin : "https://freepdfconverter-all-in-one.pages.dev";

const files = (await readdir(toolsDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name);

for (const name of files) {
  const file = path.join(toolsDir, name);
  let html = await readFile(file, "utf8");
  html = html.replace(/\n?\s*<script type="application\/ld\+json" data-tool-schema>[\s\S]*?<\/script>/i, "");

  const title = decodeHtml(extract(html, /<title>([^<]+)<\/title>/i));
  const description = decodeHtml(extract(html, /<meta\s+name="description"\s+content="([^"]+)"/i));
  const h1 = decodeHtml(extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  const label = h1 || title.replace(/\s*—.*$/i, "").replace(/\s*\|.*$/i, "").trim();
  const canonical = extract(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i) || `${origin}/tools/${name.replace(/\.html$/i, "")}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": canonical,
        "url": canonical,
        "name": title,
        "description": description,
        "inLanguage": "en",
        "mainEntity": { "@id": `${canonical}#software` }
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${canonical}#software`,
        "name": label,
        "url": canonical,
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Web browser",
        "description": description,
        "isAccessibleForFree": true,
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
      }
    ]
  };

  const block = `<script type="application/ld+json" data-tool-schema>${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`;
  html = html.replace("</head>", `${block}\n</head>`);
  await writeFile(file, html, "utf8");
}

console.log(`Injected tool structured data into ${files.length} PDF tool pages.`);

function extract(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || "";
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
