import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const START = "<!-- freepdf-keyword-context:start -->";
const END = "<!-- freepdf-keyword-context:end -->";

const blocks = {
  "tools/merge-pdf.html": {
    heading: "Merge, combine or join PDF files",
    html: "Whether you search for a <strong>merge PDF</strong> tool, a <strong>PDF combiner</strong> or a way to <strong>combine PDF files</strong>, the task is the same: put the source PDF pages into one ordered document without turning them into screenshots."
  },
  "tools/split-pdf.html": {
    heading: "Split or extract PDF pages",
    html: "This free browser tool covers the common <strong>split PDF</strong> and <strong>extract PDF pages</strong> workflows: keep a page range, create separate page files, or make a smaller PDF from a larger document."
  },
  "tools/jpg-to-pdf.html": {
    heading: "JPG, PNG and image-to-PDF conversion",
    html: "This is a free <strong>JPG to PDF converter</strong>, <strong>PNG to PDF converter</strong> and general <strong>image to PDF</strong> workflow in one browser tool. Arrange your images first, then create the PDF locally."
  },
  "tools/pdf-to-image.html": {
    heading: "Convert PDF pages to JPG or PNG",
    html: "This free <strong>PDF to JPG converter</strong> and <strong>PDF to PNG converter</strong> are useful when a page needs to be shared as an image. Select the pages you need and render them locally in your browser."
  },
  "tools/pdf-to-word.html": {
    heading: "PDF to Word, DOCX and DOC conversion",
    html: "This free browser converter covers common searches such as <strong>PDF to Word converter</strong>, <strong>convert PDF to Word</strong> and <strong>PDF to DOC</strong>. It is designed for selectable-text PDFs and creates an editable DOCX without uploading the source file."
  },
  "tools/word-to-pdf.html": {
    heading: "Word, DOC and DOCX to PDF conversion",
    html: "This free Word to PDF converter covers <strong>Word to PDF</strong>, <strong>DOC to PDF</strong> and <strong>DOCX to PDF</strong> workflows. It also accepts Microsoft Word 97–2003 <strong>.doc</strong> files and processes supported documents locally."
  },
  "tools/ocr-pdf.html": {
    heading: "OCR scanned PDFs into text and Word",
    html: "Use this browser-based <strong>OCR PDF</strong> tool to turn scanned or image-only PDF pages into selectable text. For a <strong>scanned PDF to Word</strong> workflow, OCR each page locally and download an editable DOCX or plain-text copy for review."
  },
  "tools/compress-pdf.html": {
    heading: "Compress or reduce PDF file size",
    html: "Use this free <strong>PDF compressor</strong> to <strong>compress PDF</strong> files and <strong>reduce PDF size</strong> with a lossless browser-local pass. Results vary by document contents, especially when a PDF is already dominated by compressed images."
  },
  "tools/organize-pdf.html": {
    heading: "Organize or organise PDF pages",
    html: "Use this free <strong>PDF organizer</strong> for <strong>organize PDF</strong>, <strong>organise PDF</strong>, <strong>reorder PDF pages</strong>, <strong>arrange PDF pages</strong> and deleting unwanted pages. The spelling varies by region, but the workflow is the same."
  },
  "tools/photo-compressor.html": {
    heading: "Compress an image to 20KB, 50KB or 100KB",
    html: "For searches such as <strong>compress image to 20KB</strong>, <strong>compress image to 50KB</strong>, <strong>compress image to 100KB</strong> or <strong>photo compressor for online forms</strong>, set the maximum file size and review the dimensions before downloading. Common exam, job and government-form limits vary, so follow the current application instructions."
  },
  "tools/signature-resizer.html": {
    heading: "Resize a signature for online forms",
    html: "This browser tool covers <strong>signature resizer</strong>, <strong>resize signature to 20KB</strong>, <strong>signature to 50KB</strong> and similar online-form workflows. Crop and frame the signature, set the required dimensions and maximum file size, then inspect the result before submission."
  },
  "tools/passport-id-photo-maker.html": {
    heading: "Passport size photo maker: 35×45 mm and 2×2 inch",
    html: "Use this as a <strong>passport size photo maker</strong> for common <strong>35×45 mm</strong> and <strong>2×2 inch</strong> layouts, or enter custom dimensions. Passport, visa, ID and application requirements vary by destination, so verify the current specification before submitting the generated photo."
  },
  "tools/thumb-impression-resizer.html": {
    heading: "Left thumb impression resizer for forms",
    html: "Common searches include <strong>thumb impression resizer</strong>, <strong>left thumb impression resize</strong> and <strong>thumb impression to 20KB or 50KB</strong>. Use the exact dimensions, format and maximum file size stated by the receiving application rather than assuming a universal specification."
  },
  "tools/handwritten-declaration-resizer.html": {
    heading: "Handwritten declaration resizer for online forms",
    html: "Prepare a <strong>handwritten declaration image</strong> by cropping blank paper, matching the required dimensions and reducing the file to the application's maximum size. This workflow is useful for exam and recruitment forms, but the current application notice remains the source of truth."
  }
};

const files = [];
await collectHtml(dist);

for (const file of files) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  const block = blocks[relative];
  if (!block) continue;

  let html = await readFile(file, "utf8");
  html = html.replace(new RegExp(escapeRegex(START) + "[\\s\\S]*?" + escapeRegex(END), "g"), "");

  const markup = "\n" + START + "\n" +
    '<section class="content-section keyword-context" aria-labelledby="keyword-context-title"><div class="container content-narrow"><h2 id="keyword-context-title">' +
    block.heading +
    "</h2><p>" +
    block.html +
    "</p></div></section>\n" + END;

  if (html.includes("</main>")) {
    html = html.replace("</main>", markup + "\n</main>");
    await writeFile(file, html, "utf8");
  }
}

console.log("Added natural search-intent context to priority PDF tool pages.");

async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(full);
  }
}

function escapeRegex(value) {
  return value.replace(/[-[\]{}()*+?.\\^$|]/g, "\\$&");
}
