import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const START = "<!-- freepdf-internal-links:start -->";
const END = "<!-- freepdf-internal-links:end -->";

// One-to-one topic clusters: each tool is connected to its practical guide, and
// each guide points back to the matching tool. Existing page content is preserved.
const clusters = [
  ["tools/merge-pdf.html", "guides/merge-pdf-safely.html", "Merge PDF", "How to Merge PDFs Safely"],
  ["tools/split-pdf.html", "guides/split-extract-pdf-pages.html", "Split PDF", "How to Split and Extract PDF Pages"],
  ["tools/unlock-pdf.html", "guides/unlock-password-protected-pdf.html", "Unlock PDF", "How to Unlock a Password-Protected PDF Safely"],
  ["tools/rotate-pdf.html", "guides/rotate-pdf-pages.html", "Rotate PDF", "How to Rotate PDF Pages"],
  ["tools/jpg-to-pdf.html", "guides/jpg-png-to-pdf.html", "JPG to PDF", "How to Convert JPG or PNG to PDF"],
  ["tools/pdf-to-image.html", "guides/pdf-to-jpg-vs-png.html", "PDF to JPG or PNG", "PDF to JPG vs PNG: Which Image Format Should You Use?"],
  ["tools/watermark-pdf.html", "guides/watermark-pdf-documents.html", "Watermark PDF", "How to Watermark PDF Documents"],
  ["tools/organize-pdf.html", "guides/organize-pdf-pages.html", "Organize PDF Pages", "How to Organize PDF Pages"],
  ["tools/add-page-numbers.html", "guides/add-page-numbers-to-pdf.html", "Add Page Numbers to PDF", "How to Add Page Numbers to a PDF"],
  ["tools/remove-pdf-metadata.html", "guides/remove-pdf-metadata.html", "Remove PDF Metadata", "How to Remove PDF Metadata"],
  ["tools/crop-pdf.html", "guides/crop-pdf-pages.html", "Crop PDF Pages", "How to Crop PDF Pages"],
  ["tools/extract-pdf-text.html", "guides/extract-text-from-pdf.html", "Extract PDF Text", "How to Extract Text from a PDF"]
];

const files = [];
await collectHtml(dist);

for (const file of files) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  const cluster = clusters.find(([tool, guide]) => relative === tool || relative === guide);
  if (!cluster) continue;

  let html = await readFile(file, "utf8");
  html = html.replace(new RegExp(`${escapeRegex(START)}[\\s\\S]*?${escapeRegex(END)}`, "g"), "");

  const [tool, guide, toolLabel, guideLabel] = cluster;
  const isTool = relative === tool;
  const target = isTool ? guide : tool;
  const targetLabel = isTool ? guideLabel : `Use the ${toolLabel} tool`;
  const href = relativePath(relative, target);
  const heading = isTool ? "Learn more about this PDF task" : "Try the related PDF tool";

  const block = `\n${START}\n<section class="section related-content" aria-labelledby="related-pdf-content">\n  <div class="container">\n    <div class="section-heading">\n      <h2 id="related-pdf-content">${heading}</h2>\n      <p>${isTool ? "Get practical guidance, then return to the tool when you are ready." : "Apply the steps from this guide directly with the matching browser-based tool."}</p>\n      <p><a class="button secondary" href="${href}">${escapeHtml(targetLabel)} →</a></p>\n    </div>\n  </div>\n</section>\n${END}`;

  if (html.includes("</main>")) {
    html = html.replace("</main>", `${block}\n</main>`);
    await writeFile(file, html, "utf8");
  }
}

console.log("Enhanced tool-guide internal linking for matched PDF topic clusters.");

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(full);
  }
}

function relativePath(from, to) {
  const fromDir = path.posix.dirname(from);
  let result = path.posix.relative(fromDir || ".", to);
  if (!result.startsWith(".")) result = `./${result}`;
  return result;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
