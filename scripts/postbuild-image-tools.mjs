import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const indexPath = path.join(dist, "index.html");
let index = await readFile(indexPath, "utf8");

const marker = '<section class="section alt"><div class="container"><div class="section-heading"><span class="eyebrow">Popular utility</span>';
const block = '<section class="section" id="application-upload-workflows"><div class="container"><div class="section-heading"><span class="eyebrow">Application upload workflows</span><h2>Prepare files for strict upload limits</h2><p>Use the image optimizer for photos, signatures and batch image uploads, or use target-size PDF compression when a form limits the document size.</p><p><a class="button" href="tools/photo-compressor">Prepare a photo →</a> <a class="button secondary" href="tools/signature-resizer">Prepare a signature →</a> <a class="button secondary" href="tools/compress-pdf">Compress a PDF →</a></p></div></div></section>';

if (!index.includes('id="application-upload-workflows"') && index.includes(marker)) {
  index = index.replace(marker, block + marker);
  await writeFile(indexPath, index, "utf8");
}

console.log("Added application-upload workflow cross-links to the production build");
