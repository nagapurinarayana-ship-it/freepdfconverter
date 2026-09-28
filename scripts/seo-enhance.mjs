import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pagePathname } from "./site-config.mjs";

const dist = path.join(process.cwd(), "dist");
const origin = (process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/$/, "");

// Keep SEO copy specific to the actual page intent. This changes only search-facing
// metadata; PDF tools, page content, ads, and functionality are left untouched.
const seo = {
  "index.html": [
    "Free PDF Converter Online — Free PDF Tools | FreePDF Tools",
    "Free PDF converter online with tools to merge, split, compress, organize, convert JPG to PDF, PDF to Word and Word to PDF. Supported document processing runs in your browser without uploads."
  ],
  "pdf-converter-online.html": [
    "Online PDF Converter — Free PDF Tools | FreePDF Tools",
    "Online PDF converter for merge, split, compress, organize, JPG to PDF, PDF to Word, Word to PDF and PDF-to-image tasks. Supported files are processed locally in your browser without document uploads."
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
  "tools/merge-pdf.html": ["Merge PDF Online Free — Combine PDF Files | FreePDF Tools", "Merge PDF files online free, combine PDF documents, use a PDF combiner and arrange pages in your browser without uploading the source files."],
  "tools/split-pdf.html": ["Split PDF Online Free — Extract Pages | FreePDF Tools", "Split PDF files online free, extract PDF pages or create separate PDFs in your browser without uploading the original document."],
  "tools/unlock-pdf.html": ["Unlock PDF Online Free — Remove a Known Password | FreePDF Tools", "Remove a known password from a PDF locally in your browser and download an unencrypted copy."],
  "tools/rotate-pdf.html": ["Rotate PDF Online Free — Rotate PDF Pages | FreePDF Tools", "Rotate PDF pages by 90, 180 or 270 degrees and save the corrected document in your browser."],
  "tools/jpg-to-pdf.html": ["JPG to PDF Converter Online Free | FreePDF Tools", "Convert JPG to PDF, PNG to PDF or images to PDF online free. Arrange images and choose practical page sizes while processing stays in your browser."],
  "tools/pdf-to-image.html": ["PDF to JPG & PNG Converter Online | FreePDF Tools", "Convert PDF pages to JPG or PNG images online in your browser. Render selected pages locally and download the image files without uploading the PDF."],
  "tools/watermark-pdf.html": ["Watermark PDF Online Free — Add Text Watermarks | FreePDF Tools", "Add a customizable text watermark to PDF pages with adjustable size, opacity, color and angle in your browser."],
  "tools/organize-pdf.html": ["Organize PDF Online Free — Reorder & Arrange Pages | FreePDF Tools", "Organize PDF pages online free with a PDF organizer. Reorder, rearrange, arrange or delete pages in your browser and download a new PDF without uploading the original."],
  "tools/add-page-numbers.html": ["Add Page Numbers to PDF Online | FreePDF Tools", "Add page numbers to all or selected PDF pages with flexible placement and styling directly in your browser."],
  "tools/remove-pdf-metadata.html": ["Remove PDF Metadata Online | FreePDF Tools", "Clear common PDF metadata fields including author, title, subject and keywords directly in your browser."],
  "tools/crop-pdf.html": ["Crop PDF Pages Online Free — Trim PDF Margins | FreePDF Tools", "Crop PDF pages with precise millimetre margins to remove unwanted borders and blank edges in your browser."],
  "tools/extract-pdf-text.html": ["Extract Text from PDF Online — Free PDF Text Extractor | FreePDF Tools", "Extract selectable text from a PDF in your browser so you can copy or download the text without uploading the document."],
  "tools/pdf-to-word.html": ["PDF to Word Converter Free — PDF to DOCX | FreePDF Tools", "Convert PDF to Word or PDF to DOCX online for free. Extract selectable text into an editable Word document in your browser without uploading the PDF."],
  "tools/word-to-pdf.html": ["Word to PDF Converter Free — DOC & DOCX | FreePDF Tools", "Convert Word to PDF, DOC to PDF or DOCX to PDF online for free, including Microsoft Word 97–2003 DOC files. Supported documents are processed locally in your browser."],
  "tools/compress-pdf.html": ["Compress PDF Online Free — Reduce PDF Size | FreePDF Tools", "Compress PDF files online free in your browser. Reduce PDF file size with a lossless local pass and download a smaller copy without uploading the original document."],
  "tools/ocr-pdf.html": ["OCR PDF Online Free — Scanned PDF to Word | FreePDF Tools", "OCR scanned PDF files online free in your browser. Recognize text from image-only PDF pages and download editable Word DOCX or plain text without uploading the source document."],
  "guides/index.html": ["PDF Guides — Merge, Split, Convert & Manage | FreePDF Tools", "Practical PDF guides covering merging, splitting, unlocking, rotation, image conversion, watermarking, page organization and privacy."],
  "guides/reduce-pdf-file-size-for-email.html": ["Compress PDF for Email — Reduce PDF Size Safely | FreePDF Tools", "Learn how to compress or reduce PDF file size for email, when page extraction helps, what a PDF size reducer can actually change, and when true compression is required."],
  "guides/merge-pdf-safely.html": ["How to Merge PDFs Safely — Step-by-Step PDF Guide | FreePDF Tools", "Learn how to combine PDF files in the right order, avoid common mistakes and merge documents locally in your browser."],
  "guides/split-extract-pdf-pages.html": ["How to Split and Extract PDF Pages — Complete Guide | FreePDF Tools", "Learn practical ways to split a PDF, extract selected pages and create separate documents while keeping source files on your device."],
  "guides/unlock-password-protected-pdf.html": ["How to Unlock a Password-Protected PDF Safely | FreePDF Tools", "Learn how to unlock a PDF when you know its password, what limitations apply and how local browser processing protects the source file."],
  "guides/rotate-pdf-pages.html": ["How to Rotate PDF Pages — Fix Sideways Documents | FreePDF Tools", "Learn how to rotate individual or multiple PDF pages, choose the right angle and save a corrected document."],
  "guides/jpg-png-to-pdf.html": ["How to Convert JPG or PNG to PDF — Practical Guide | FreePDF Tools", "Learn how to turn images into PDF documents, choose page sizes and arrange multiple images before creating the final file."],
  "guides/pdf-to-jpg-vs-png.html": ["PDF to JPG vs PNG — Quality, Size & Uses | FreePDF Tools", "PDF to JPG vs PNG explained: compare image quality, file size, text clarity, transparency, resolution and use cases to choose the right format for your PDF pages."],
  "guides/watermark-pdf-documents.html": ["How to Watermark PDF Documents — Practical Guide | FreePDF Tools", "Learn how to add readable text watermarks to PDFs, choose placement and opacity, and create the result in your browser."],
  "guides/organize-pdf-pages.html": ["How to Organize PDF Pages — Reorder, Arrange & Delete | FreePDF Tools", "Learn how to organize PDF pages, reorder or rearrange them, remove unwanted pages and save a clean document without uploading the source file."],
  "guides/add-page-numbers-to-pdf.html": ["How to Add Page Numbers to a PDF — Step-by-Step Guide | FreePDF Tools", "Learn how to number PDF pages, choose placement and style, and create a numbered copy directly in your browser."],
  "guides/remove-pdf-metadata.html": ["How to Remove PDF Metadata — Privacy and Sharing Guide | FreePDF Tools", "Learn which common PDF metadata fields can be removed before sharing a document and how to clean them locally in your browser."],
  "guides/crop-pdf-pages.html": ["How to Crop PDF Pages — Remove Borders & Margins | FreePDF Tools", "Learn how to crop PDF pages with precise margins and avoid common mistakes when trimming document edges."],
  "guides/extract-text-from-pdf.html": ["How to Extract Text from a PDF — Step-by-Step Guide | FreePDF Tools", "Learn how to extract selectable PDF text, understand browser limitations and save or copy the resulting text."],
  "guides/are-online-pdf-converters-safe.html": ["Are Online PDF Converters Safe? Privacy Guide | FreePDF Tools", "Understand the privacy tradeoffs of online PDF converters, what file uploads mean, and when local browser processing can help."],
  "guides/pdf-converter-without-upload.html": ["How to Convert PDFs Without Uploading Files | FreePDF Tools", "Learn how browser-based PDF processing works, why files can stay on your device, and when local conversion is useful."],
  "guides/pdf-to-word-converter.html": ["How to Convert PDF to Word — Editable DOCX Guide | FreePDF Tools", "Learn how to convert text-based PDFs to editable Word DOCX files, what happens to tables and layout, and why scanned PDFs may need OCR."],
  "guides/word-to-pdf-converter.html": ["How to Convert Word to PDF — DOC & DOCX | FreePDF Tools", "Learn how to convert DOC, DOCX and Word 97–2003 files to PDF in your browser, including layout limitations and final quality checks."],
  "guides/compress-pdf.html": ["How to Compress a PDF — Reduce File Size Safely | FreePDF Tools", "Learn how to compress a PDF, what lossless compression can change, why image-heavy files may shrink less and when stronger image optimization is needed."],
  "guides/ocr-pdf-to-word.html": ["How to OCR a Scanned PDF into Word — Complete Guide | FreePDF Tools", "Learn how OCR turns scanned PDF page images into selectable text and an editable Word document, what affects accuracy and how to review the result."]
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
