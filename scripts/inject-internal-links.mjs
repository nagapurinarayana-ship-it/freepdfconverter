import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { toolRegistry } from "./tool-registry.mjs";

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
  ["tools/extract-pdf-text.html", "guides/extract-text-from-pdf.html", "Extract PDF Text", "How to Extract Text from a PDF"],
  ["tools/pdf-to-word.html", "guides/pdf-to-word-converter.html", "PDF to Word", "How to Convert PDF to Word"],
  ["tools/word-to-pdf.html", "guides/word-to-pdf-converter.html", "Word to PDF", "How to Convert Word to PDF"],
  ["tools/compress-pdf.html", "guides/compress-pdf.html", "Compress PDF", "How to Compress a PDF"],
  ["tools/ocr-pdf.html", "guides/ocr-pdf-to-word.html", "OCR PDF", "How to OCR a Scanned PDF into Word"],
  ["tools/sign-pdf.html", "guides/sign-pdf-online.html", "Sign PDF", "How to Sign a PDF Online Without Uploading It"],
  ["tools/protect-pdf.html", "guides/password-protect-pdf.html", "Protect PDF", "How to Password Protect a PDF Safely"],
  ["tools/photo-compressor.html", "guides/compress-photo-to-20kb.html", "Photo Compressor", "How to Compress a Photo to 20KB, 50KB or 100KB"],
  ["tools/signature-resizer.html", "guides/resize-signature-for-forms.html", "Signature Resizer", "How to Resize a Signature for Online Forms"]
];

for (const tool of toolRegistry) {
  if (!tool.guide) continue;
  if (clusters.some(([toolPath]) => toolPath === tool.path)) continue;
  clusters.push([tool.path, tool.guide, tool.label, tool.guideLabel || tool.guide]);
}

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

const IMAGE_CLUSTER_START = "<!-- freepdf-image-cluster:start -->";
const IMAGE_CLUSTER_END = "<!-- freepdf-image-cluster:end -->";

const imageClusters = [
  ["tools/photo-compressor.html", "Photo Compressor", "guides/compress-photo-to-20kb.html", "How to Compress a Photo to 20KB, 50KB or 100KB"],
  ["tools/signature-resizer.html", "Signature Resizer", "guides/resize-signature-for-forms.html", "How to Resize a Signature for Online Forms"],
  ["tools/passport-id-photo-maker.html", "Passport & ID Photo Maker", "guides/passport-id-photo-size.html", "How to Resize a Passport or ID Photo"],
  ["tools/thumb-impression-resizer.html", "Thumb Impression Resizer", "guides/resize-thumb-impression.html", "How to Resize a Thumb Impression for Online Forms"],
  ["tools/handwritten-declaration-resizer.html", "Handwritten Declaration Resizer", "guides/resize-handwritten-declaration.html", "How to Resize a Handwritten Declaration for an Online Form"]
];

for (const file of files) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  if (!imageClusters.some(([tool, , guide]) => relative === tool || relative === guide)) continue;

  let html = await readFile(file, "utf8");
  html = html.replace(new RegExp(escapeRegex(IMAGE_CLUSTER_START) + "[\\s\\S]*?" + escapeRegex(IMAGE_CLUSTER_END), "g"), "");

  const relatedTools = imageClusters
    .filter(([tool]) => tool !== relative)
    .slice(0, 4)
    .map(([tool, label]) => "<li><a href=\"" + relativePath(relative, tool) + "\">" + escapeHtml(label) + "</a></li>")
    .join("");

  const relatedGuides = imageClusters
    .filter(([, , guide]) => guide !== relative)
    .slice(0, 4)
    .map(([, , guide, label]) => "<li><a href=\"" + relativePath(relative, guide) + "\">" + escapeHtml(label) + "</a></li>")
    .join("");

  const clusterBlock = "\n" + IMAGE_CLUSTER_START + "\n<section class=\"section related-content\" aria-labelledby=\"related-image-tools\">\n" +
    "  <div class=\"container\">\n" +
    "    <div class=\"section-heading\">\n" +
    "      <h2 id=\"related-image-tools\">Related image and form tools</h2>\n" +
    "      <p>These tools solve adjacent image-upload requirements such as photos, signatures, thumb impressions and handwritten declarations.</p>\n" +
    "      <ul class=\"footer-links\">" + relatedTools + "</ul>\n" +
    "      <h3>Related preparation guides</h3>\n" +
    "      <ul class=\"footer-links\">" + relatedGuides + "</ul>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</section>\n" + IMAGE_CLUSTER_END;

  if (html.includes("</main>")) {
    html = html.replace("</main>", clusterBlock + "\n</main>");
    await writeFile(file, html, "utf8");
  }
}

console.log("Enhanced image/form topical internal linking.");
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
