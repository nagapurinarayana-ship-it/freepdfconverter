import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const START = "<!-- freepdf-topic-links:start -->";
const END = "<!-- freepdf-topic-links:end -->";

const targets = {
  "tools/pdf-to-word.html": [["/topics/pdf-to-word-without-upload","PDF to Word without uploading"],["/topics/scanned-pdf-to-word","Scanned PDF to Word with OCR"],["/topics/pdf-to-word-formatting","PDF to Word formatting"]],
  "guides/pdf-to-word-converter.html": [["/topics/pdf-to-word-without-upload","PDF to Word without uploading"],["/topics/pdf-to-word-formatting","PDF to Word formatting"],["/topics/pdf-to-word-tables","PDF to Word tables"]],
  "tools/word-to-pdf.html": [["/topics/doc-to-pdf","DOC to PDF"],["/topics/docx-to-pdf","DOCX to PDF"],["/topics/word-97-2003-to-pdf","Word 97–2003 to PDF"]],
  "guides/word-to-pdf-converter.html": [["/topics/doc-to-pdf","DOC to PDF"],["/topics/docx-to-pdf","DOCX to PDF"],["/topics/word-97-2003-to-pdf","Word 97–2003 to PDF"]],
  "tools/ocr-pdf.html": [["/topics/ocr-pdf-online","OCR PDF online"],["/topics/ocr-pdf-accuracy","OCR accuracy"]],
  "guides/ocr-pdf-to-word.html": [["/topics/scanned-pdf-to-word","Scanned PDF to Word"],["/topics/ocr-pdf-online","OCR PDF online"],["/topics/ocr-pdf-accuracy","OCR accuracy"]],
  "tools/extract-pdf-text.html": [["/topics/pdf-to-text","PDF to text"],["/topics/ocr-pdf-online","When to use OCR"]],
  "guides/extract-text-from-pdf.html": [["/topics/pdf-to-text","PDF to text"],["/topics/ocr-pdf-online","When to use OCR"]],
  "tools/compress-pdf.html": [["/topics/compress-pdf-to-target-size","Compress PDF to a target size"]],
  "guides/compress-pdf.html": [["/topics/compress-pdf-to-target-size","Compress PDF to a target size"]],
  "tools/jpg-to-pdf.html": [["/topics/jpg-to-pdf-on-mobile","JPG to PDF on mobile"],["/topics/pdf-page-size","PDF page size"]],
  "guides/jpg-png-to-pdf.html": [["/topics/jpg-to-pdf-on-mobile","JPG to PDF on mobile"],["/topics/pdf-page-size","PDF page size"]],
  "tools/pdf-to-image.html": [["/topics/pdf-to-jpg","PDF to JPG"]],
  "guides/pdf-to-jpg-vs-png.html": [["/topics/pdf-to-jpg","PDF to JPG"]],
  "pdf-converter-online.html": [["/topics/pdf-converter-file-formats","PDF converter file formats"],["/topics/private-pdf-converter","Private PDF converter"],["/topics/pdf-to-word-without-upload","PDF to Word without uploading"]],
  "guides/pdf-converter-without-upload.html": [["/topics/private-pdf-converter","Private PDF converter"],["/topics/pdf-to-word-without-upload","PDF to Word without uploading"]]
};

const files = [];
await collectHtml(dist);

for (const file of files) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  const links = targets[relative];
  if (!links) continue;
  let html = await readFile(file, "utf8");
  html = html.replace(new RegExp(escapeRegex(START) + "[\\s\\S]*?" + escapeRegex(END), "g"), "");
  const items = links.map(([href,label]) => '<li><a href="' + href + '">' + escapeHtml(label) + '</a></li>').join("");
  const block = "\n" + START + "\n<section class=\"section related-topics\" aria-labelledby=\"related-topic-title\"><div class=\"container content-narrow\"><h2 id=\"related-topic-title\">Related PDF topics</h2><p>Explore a focused explanation before or after using the tool.</p><ul class=\"footer-links\">" + items + "</ul></div></section>\n" + END;
  if (html.includes("</main>")) {
    html = html.replace("</main>", block + "\n</main>");
    await writeFile(file, html, "utf8");
  }
}
console.log("Injected topic links into priority tools and guides.");

async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
}
function escapeRegex(value) { return value.replace(/[.*+?^$()|[\\]\\]/g, "\\$&"); }
function escapeHtml(value) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
