import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const productionBranch = !process.env.CF_PAGES_BRANCH || process.env.CF_PAGES_BRANCH === "main";
const suppliedOrigin = String(process.env.SITE_ORIGIN || (productionBranch ? process.env.CF_PAGES_URL || "" : "")).replace(/\/+$/, "");
const origin = /^https?:\/\/[^/]+$/i.test(suppliedOrigin) ? suppliedOrigin : "";
const files = ["index.html", "about.html", "privacy.html", "terms.html", "contact.html", "404.html", "robots.txt", "_headers"];
const directories = ["assets", "tools", "guides"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of files) await cp(path.join(root, file), path.join(dist, file));
for (const directory of directories) await cp(path.join(root, directory), path.join(dist, directory), { recursive: true });

const indexable = [
  "index.html",
  "about.html",
  "tools/merge-pdf.html",
  "tools/split-pdf.html",
  "tools/rotate-pdf.html",
  "tools/jpg-to-pdf.html",
  "tools/pdf-to-image.html",
  "tools/watermark-pdf.html",
  "guides/index.html"
];

if (origin) {
  for (const relative of indexable) {
    const file = path.join(dist, relative);
    const html = await readFile(file, "utf8");
    const pathname = relative === "index.html" ? "/" : "/" + relative.replace(/index\.html$/, "");
    const canonical = origin + pathname;
    const next = html.replace("</head>", '<link rel="canonical" href="' + canonical + '">\n</head>');
    await writeFile(file, next, "utf8");
  }
  const urls = indexable.map((relative) => {
    const pathname = relative === "index.html" ? "/" : "/" + relative.replace(/index\.html$/, "");
    return "  <url><loc>" + origin + pathname + "</loc></url>";
  }).join("\n");
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
  await writeFile(path.join(dist, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: " + origin + "/sitemap.xml\n", "utf8");
}

console.log("Built FreePDF Tools" + (origin ? " for " + origin : " without production canonical URLs"));
