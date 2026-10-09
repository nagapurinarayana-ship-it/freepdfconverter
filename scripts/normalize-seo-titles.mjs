import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const titles = {
  "tools/organize-pdf.html": "Organize PDF Pages Online Free | FreePDF Tools",
  "tools/word-to-pdf.html": "Word to PDF Converter — DOC, DOCX & 97–2003 | FreePDF Tools",
  "guides/organize-pdf-pages.html": "How to Reorder or Delete PDF Pages (Step-by-Step)",
  "guides/pdf-to-jpg-vs-png.html": "PDF vs JPG vs PNG: Quality, Size & Uses | FreePDF Tools"
};

for (const [relative, title] of Object.entries(titles)) {
  const file = path.join(dist, relative);
  let html = await readFile(file, "utf8");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  html = html.replace(/(<meta\s+property=["']og:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeAttribute(title)}$2`);
  html = html.replace(/(<meta\s+name=["']twitter:title["'][^>]*content=["'])[^"']*(["'][^>]*>)/i, `$1${escapeAttribute(title)}$2`);
  await writeFile(file, html, "utf8");
}

console.log("Normalized long SEO titles on 4 high-priority pages.");

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
