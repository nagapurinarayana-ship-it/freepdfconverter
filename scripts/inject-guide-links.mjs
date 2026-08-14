import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const START = "<!-- freepdf-guide-links:start -->";
const END = "<!-- freepdf-guide-links:end -->";

const related = {
  "guides/merge-pdf-safely.html": [
    ["guides/split-extract-pdf-pages.html", "Split and extract PDF pages"],
    ["guides/organize-pdf-pages.html", "Organize PDF pages"],
    ["guides/pdf-converter-without-upload.html", "Convert PDFs without uploading files"]
  ],
  "guides/split-extract-pdf-pages.html": [
    ["guides/merge-pdf-safely.html", "Merge PDFs safely"],
    ["guides/organize-pdf-pages.html", "Organize PDF pages"],
    ["guides/extract-text-from-pdf.html", "Extract text from a PDF"]
  ],
  "guides/unlock-password-protected-pdf.html": [
    ["guides/are-online-pdf-converters-safe.html", "Are online PDF converters safe?"],
    ["guides/pdf-converter-without-upload.html", "Convert PDFs without uploading files"],
    ["guides/merge-pdf-safely.html", "Merge PDFs safely"]
  ],
  "guides/rotate-pdf-pages.html": [
    ["guides/crop-pdf-pages.html", "Crop PDF pages"],
    ["guides/organize-pdf-pages.html", "Organize PDF pages"],
    ["guides/merge-pdf-safely.html", "Merge PDFs safely"]
  ],
  "guides/jpg-png-to-pdf.html": [
    ["guides/pdf-to-jpg-vs-png.html", "PDF to JPG vs PNG"],
    ["guides/pdf-converter-without-upload.html", "Convert PDFs without uploading files"],
    ["guides/are-online-pdf-converters-safe.html", "Are online PDF converters safe?"]
  ],
  "guides/pdf-to-jpg-vs-png.html": [
    ["guides/jpg-png-to-pdf.html", "Convert JPG or PNG to PDF"],
    ["guides/pdf-converter-without-upload.html", "Convert PDFs without uploading files"],
    ["guides/are-online-pdf-converters-safe.html", "Are online PDF converters safe?"]
  ],
  "guides/watermark-pdf-documents.html": [
    ["guides/organize-pdf-pages.html", "Organize PDF pages"],
    ["guides/add-page-numbers-to-pdf.html", "Add page numbers to a PDF"],
    ["guides/remove-pdf-metadata.html", "Remove PDF metadata"]
  ],
  "guides/organize-pdf-pages.html": [
    ["guides/merge-pdf-safely.html", "Merge PDFs safely"],
    ["guides/split-extract-pdf-pages.html", "Split and extract PDF pages"],
    ["guides/add-page-numbers-to-pdf.html", "Add page numbers to a PDF"]
  ],
  "guides/add-page-numbers-to-pdf.html": [
    ["guides/organize-pdf-pages.html", "Organize PDF pages"],
    ["guides/watermark-pdf-documents.html", "Watermark PDF documents"],
    ["guides/remove-pdf-metadata.html", "Remove PDF metadata"]
  ],
  "guides/remove-pdf-metadata.html": [
    ["guides/are-online-pdf-converters-safe.html", "Are online PDF converters safe?"],
    ["guides/pdf-converter-without-upload.html", "Convert PDFs without uploading files"],
    ["guides/watermark-pdf-documents.html", "Watermark PDF documents"]
  ],
  "guides/crop-pdf-pages.html": [
    ["guides/rotate-pdf-pages.html", "Rotate PDF pages"],
    ["guides/organize-pdf-pages.html", "Organize PDF pages"],
    ["guides/merge-pdf-safely.html", "Merge PDFs safely"]
  ],
  "guides/extract-text-from-pdf.html": [
    ["guides/split-extract-pdf-pages.html", "Split and extract PDF pages"],
    ["guides/pdf-converter-without-upload.html", "Convert PDFs without uploading files"],
    ["guides/are-online-pdf-converters-safe.html", "Are online PDF converters safe?"]
  ],
  "guides/are-online-pdf-converters-safe.html": [
    ["guides/pdf-converter-without-upload.html", "Convert PDFs without uploading files"],
    ["guides/remove-pdf-metadata.html", "Remove PDF metadata"],
    ["guides/unlock-password-protected-pdf.html", "Unlock a password-protected PDF safely"]
  ],
  "guides/pdf-converter-without-upload.html": [
    ["guides/are-online-pdf-converters-safe.html", "Are online PDF converters safe?"],
    ["guides/merge-pdf-safely.html", "Merge PDFs safely"],
    ["guides/jpg-png-to-pdf.html", "Convert JPG or PNG to PDF"]
  ]
};

const files = [];
await collectHtml(dist);

for (const file of files) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  const links = related[relative];
  if (!links) continue;

  let html = await readFile(file, "utf8");
  html = html.replace(new RegExp(`${escapeRegex(START)}[\\s\\S]*?${escapeRegex(END)}`, "g"), "");

  const items = links.map(([target, label]) => `<li><a href="${relativePath(relative, target)}">${escapeHtml(label)}</a></li>`).join("");
  const block = `\n${START}\n<section class="section related-guides" aria-labelledby="related-guides-title"><div class="container content-narrow"><h2 id="related-guides-title">Related PDF guides</h2><p>Explore another practical PDF task or privacy topic.</p><ul class="footer-links related-guide-list">${items}</ul></div></section>\n${END}`;

  if (html.includes("</main>")) {
    html = html.replace("</main>", `${block}\n</main>`);
    await writeFile(file, html, "utf8");
  }
}

console.log("Enhanced guide-to-guide internal linking.");

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(full);
  }
}

function relativePath(from, to) {
  let result = path.posix.relative(path.posix.dirname(from), to);
  if (!result.startsWith(".")) result = `./${result}`;
  return result;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
