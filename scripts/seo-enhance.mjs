import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pagePathname } from "./site-config.mjs";

const dist = path.join(process.cwd(), "dist");
const origin = (process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/$/, "");

// Keep SEO copy specific to the actual page intent. This changes only search-facing
// metadata; PDF tools, page content, ads, and functionality are left untouched.
const seo = {
  "index.html": [
    "Free PDF Converter — Merge, Split & Convert | FreePDF Tools",
    "Free PDF converter and online PDF tools for merging, splitting, unlocking, organizing and converting PDFs. Process files privately in your browser with no uploads or account."
  ],
  "pdf-converter-online.html": [
    "Free PDF Converter Online — Convert PDFs in Your Browser | FreePDF Tools",
    "Convert and manage PDFs directly in your browser with FreePDF Tools. Merge, split, rotate, unlock, crop, organize and watermark files without uploading documents."
  ],
  "about.html": ["About FreePDF Tools — Private Browser PDF Utilities", "Learn how FreePDF Tools works, why PDF processing happens in your browser, and how the service is designed around privacy and simple document workflows."],
  "how-local-processing.html": ["How Local PDF Processing Works — FreePDF Tools", "See how FreePDF Tools processes supported PDF files locally in your browser, what stays on your device, and what to expect from local document processing."],
  "unlock-pdf-online.html": ["Unlock PDF Online — Remove a Known PDF Password Locally | FreePDF Tools", "Unlock a password-protected PDF when you know the password. Process the document locally in your browser and download an unencrypted copy without uploading the file."],
  "merge-pdf-online.html": ["Merge PDF Online — Combine PDF Files Privately | FreePDF Tools", "Merge multiple PDF files into one document in your browser. Reorder pages and download the combined PDF without uploading your source files."],
  "split-pdf-online.html": ["Split PDF Online — Extract or Separate PDF Pages | FreePDF Tools", "Split a PDF by page range or create individual PDF pages in your browser. Your source document stays on your device while you create the result."],
  "jpg-to-pdf-online.html": ["JPG to PDF Online — Convert Images to PDF Privately | FreePDF Tools", "Convert JPG and PNG images to PDF in your browser. Choose practical page sizes, arrange images, and create a PDF without uploading your files."],
  "rotate-pdf-online.html": ["Rotate PDF Online — Fix Sideways PDF Pages | FreePDF Tools", "Rotate PDF pages by 90, 180 or 270 degrees directly in your browser. Fix sideways or upside-down pages without uploading the document."],
  "crop-pdf-online.html": ["Crop PDF Online — Trim PDF Pages and Margins | FreePDF Tools", "Crop PDF pages with precise margins in your browser. Remove unwanted borders or blank edges and download the corrected PDF without uploading it."],
  "remove-pdf-metadata-online.html": ["Remove PDF Metadata Online — Clean Document Metadata | FreePDF Tools", "Remove common PDF metadata such as author, title, subject and keywords in your browser. Create a cleaner copy without uploading the original document."],
  "tools/merge-pdf.html": ["Merge PDF Files Online Free — Combine PDFs | FreePDF Tools", "Combine multiple PDF files into one document, arrange their order and download the result directly in your browser."],
  "tools/split-pdf.html": ["Split PDF Online Free — Extract PDF Pages | FreePDF Tools", "Split a PDF by page range or separate its pages into individual PDFs directly in your browser."],
  "tools/unlock-pdf.html": ["Unlock PDF Online Free — Remove a Known Password | FreePDF Tools", "Remove a known password from a PDF locally in your browser and download an unencrypted copy."],
  "tools/rotate-pdf.html": ["Rotate PDF Online Free — Rotate PDF Pages | FreePDF Tools", "Rotate PDF pages by 90, 180 or 270 degrees and save the corrected document in your browser."],
  "tools/jpg-to-pdf.html": ["JPG to PDF Online Free — Convert Images to PDF | FreePDF Tools", "Convert JPG or PNG images into an ordered PDF with practical page-size options, processed in your browser."],
  "tools/pdf-to-image.html": ["PDF to JPG or PNG Online — Convert PDF Pages to Images | FreePDF Tools", "Render selected PDF pages as JPG or PNG images directly in your browser and download the results."],
  "tools/watermark-pdf.html": ["Watermark PDF Online Free — Add Text Watermarks | FreePDF Tools", "Add a customizable text watermark to PDF pages with adjustable size, opacity, color and angle in your browser."],
  "tools/organize-pdf.html": ["Organize PDF Online Free — Reorder, Delete & Arrange Pages | FreePDF Tools", "Organize PDF pages online free. Reorder, move, remove and arrange pages in your browser, then download a new PDF without uploading the original file."],
  "tools/add-page-numbers.html": ["Add Page Numbers to PDF Online — Free PDF Numbering Tool | FreePDF Tools", "Add page numbers to all or selected PDF pages with flexible placement and styling directly in your browser."],
  "tools/remove-pdf-metadata.html": ["Remove PDF Metadata Online Free — Clean Author and Title Data | FreePDF Tools", "Clear common PDF metadata fields including author, title, subject and keywords directly in your browser."],
  "tools/crop-pdf.html": ["Crop PDF Pages Online Free — Trim PDF Margins | FreePDF Tools", "Crop PDF pages with precise millimetre margins to remove unwanted borders and blank edges in your browser."],
  "tools/extract-pdf-text.html": ["Extract Text from PDF Online — Free PDF Text Extractor | FreePDF Tools", "Extract selectable text from a PDF in your browser so you can copy or download the text without uploading the document."],
  "guides/index.html": ["PDF Guides — How to Merge, Split, Convert and Manage PDFs | FreePDF Tools", "Practical PDF guides covering merging, splitting, unlocking, rotation, image conversion, watermarking, page organization and privacy."],
  "guides/merge-pdf-safely.html": ["How to Merge PDFs Safely — Step-by-Step PDF Guide | FreePDF Tools", "Learn how to combine PDF files in the right order, avoid common mistakes and merge documents locally in your browser."],
  "guides/split-extract-pdf-pages.html": ["How to Split and Extract PDF Pages — Complete Guide | FreePDF Tools", "Learn practical ways to split a PDF, extract selected pages and create separate documents while keeping source files on your device."],
  "guides/unlock-password-protected-pdf.html": ["How to Unlock a Password-Protected PDF Safely | FreePDF Tools", "Learn how to unlock a PDF when you know its password, what limitations apply and how local browser processing protects the source file."],
  "guides/rotate-pdf-pages.html": ["How to Rotate PDF Pages — Fix Sideways Documents | FreePDF Tools", "Learn how to rotate individual or multiple PDF pages, choose the right angle and save a corrected document."],
  "guides/jpg-png-to-pdf.html": ["How to Convert JPG or PNG to PDF — Practical Guide | FreePDF Tools", "Learn how to turn images into PDF documents, choose page sizes and arrange multiple images before creating the final file."],
  "guides/pdf-to-jpg-vs-png.html": ["PDF to JPG vs PNG — Which Is Better? Quality, Size & Uses | FreePDF Tools", "PDF to JPG vs PNG explained: compare image quality, file size, text clarity, transparency, resolution and use cases to choose the right format for your PDF pages."],
  "guides/watermark-pdf-documents.html": ["How to Watermark PDF Documents — Practical Guide | FreePDF Tools", "Learn how to add readable text watermarks to PDFs, choose placement and opacity, and create the result in your browser."],
  "guides/organize-pdf-pages.html": ["Delete or Rearrange PDF Pages Free | FreePDF Tools", "Learn how to reorder PDF pages, remove unwanted pages and save a clean document without uploading the source file."],
  "guides/add-page-numbers-to-pdf.html": ["How to Add Page Numbers to a PDF — Step-by-Step Guide | FreePDF Tools", "Learn how to number PDF pages, choose placement and style, and create a numbered copy directly in your browser."],
  "guides/remove-pdf-metadata.html": ["How to Remove PDF Metadata — Privacy and Sharing Guide | FreePDF Tools", "Learn which common PDF metadata fields can be removed before sharing a document and how to clean them locally in your browser."],
  "guides/crop-pdf-pages.html": ["How to Crop PDF Pages — Remove Borders and Blank Margins | FreePDF Tools", "Learn how to crop PDF pages with precise margins and avoid common mistakes when trimming document edges."],
  "guides/extract-text-from-pdf.html": ["How to Extract Text from a PDF — Step-by-Step Guide | FreePDF Tools", "Learn how to extract selectable PDF text, understand browser limitations and save or copy the resulting text."],
  "guides/are-online-pdf-converters-safe.html": ["Are Online PDF Converters Safe? Privacy and Security Guide | FreePDF Tools", "Understand the privacy tradeoffs of online PDF converters, what file uploads mean, and when local browser processing can help."],
  "guides/pdf-converter-without-upload.html": ["How to Convert PDFs Without Uploading Files | FreePDF Tools", "Learn how browser-based PDF processing works, why files can stay on your device, and when local conversion is useful."]
};

const htmlFiles = [];
await collectHtml(dist);

for (const file of htmlFiles) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  const values = seo[relative];

  let html = await readFile(file, "utf8");
  const canonicalUrl = origin + pagePathname(relative);
  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']+["'][^>]*>/i, `<link rel="canonical" href="${canonicalUrl}">`);
  html = replaceMeta(html, "og:url", canonicalUrl);

  if (values) {
    const [title, description] = values;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(/<meta\s+name=["']description["']\s+content=["'][\s\S]*?["'][^>]*>/i, `<meta name="description" content="${escapeAttribute(description)}">`);
    html = replaceMeta(html, "og:title", title);
    html = replaceMeta(html, "og:description", description);
    html = replaceMeta(html, "twitter:title", title);
    html = replaceMeta(html, "twitter:description", description);
  }

  await writeFile(file, html, "utf8");
}

console.log(`Enhanced unique SEO titles/descriptions on ${htmlFiles.length} generated HTML pages.`);

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) htmlFiles.push(full);
  }
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return escapeAttribute(value).replace(/&quot;/g, "&quot;");
}

function replaceMeta(html, property, value) {
  const escaped = escapeAttribute(value);
  const pattern = new RegExp(`(<meta\\s+[^>]*(?:property|name)=["']${property}["'][^>]*content=["'])[^"']*(["'][^>]*>)`, "i");
  const reversePattern = new RegExp(`(<meta\\s+[^>]*(?:property|name)=["']${property}["'][^>]*content=["'])[^"']*(["'][^>]*>)`, "i");
  if (pattern.test(html)) return html.replace(pattern, `$1${escaped}$2`);
  if (reversePattern.test(html)) return html.replace(reversePattern, `$1${escaped}$2`);
  return html;
}
