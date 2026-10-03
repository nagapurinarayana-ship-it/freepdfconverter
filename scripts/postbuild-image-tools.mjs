import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const origin = String(process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/+$/, "");

const indexPath = path.join(dist, "index.html");
let index = await readFile(indexPath, "utf8");

const marker = '<section class="section alt"><div class="container"><div class="section-heading"><span class="eyebrow">Popular utility</span>';
const block = `<section class="section" id="image-signature-tools"><div class="container"><div class="section-heading"><span class="eyebrow">New everyday utilities</span><h2>Photo, signature and PDF size tools</h2><p>Prepare images and signatures for online forms, then compress PDFs without uploading your files.</p></div><div class="tool-grid"><a class="tool-card" href="tools/photo-compressor"><span class="tool-icon">IMG</span><h3>Photo Compressor</h3><p>Compress JPG, PNG and WebP images to 20KB, 50KB, 100KB, 200KB or a custom practical target.</p><span class="go">Compress a photo →</span></a><a class="tool-card" href="tools/signature-resizer"><span class="tool-icon">✎</span><h3>Signature Resizer</h3><p>Resize a signature, clean a near-white background and prepare a small JPG, PNG or WebP copy for forms.</p><span class="go">Resize a signature →</span></a><a class="tool-card" href="tools/compress-pdf"><span class="tool-icon">%</span><h3>PDF Compressor</h3><p>Reduce PDF structure overhead with a lossless browser-local compression pass.</p><span class="go">Compress a PDF →</span></a></div></div></section>`;

if (!index.includes('id="image-signature-tools"') && index.includes(marker)) {
  index = index.replace(marker, block + marker);
  await writeFile(indexPath, index, "utf8");
}

const sitemapPath = path.join(dist, "sitemap.xml");
try {
  let sitemap = await readFile(sitemapPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const pages = [
    "/tools/photo-compressor",
    "/tools/signature-resizer"
  ];
  for (const pathname of pages) {
    const loc = origin + pathname;
    if (!sitemap.includes("<loc>" + loc + "</loc>")) {
      sitemap = sitemap.replace("</urlset>", `  <url><loc>${loc}</loc><lastmod>${today}</lastmod></url>\n</urlset>`);
    }
  }
  await writeFile(sitemapPath, sitemap, "utf8");
} catch {
  // A later build step may create the fallback sitemap; tool pages remain available.
}

console.log("Added photo and signature utilities to the production build");
