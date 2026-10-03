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
  "tools/organize-pdf.html": ["Organize PDF Online Free — Reorder, Rearrange & Delete Pages | FreePDF Tools", "Organize PDF pages online free with a PDF page organizer. Reorder, rearrange, arrange and delete pages in your browser without uploading the original PDF."],
  "tools/add-page-numbers.html": ["Add Page Numbers to PDF Online | FreePDF Tools", "Add page numbers to all or selected PDF pages with flexible placement and styling directly in your browser."],
  "tools/remove-pdf-metadata.html": ["Remove PDF Metadata Online | FreePDF Tools", "Clear common PDF metadata fields including author, title, subject and keywords directly in your browser."],
  "tools/crop-pdf.html": ["Crop PDF Pages Online Free — Trim PDF Margins | FreePDF Tools", "Crop PDF pages with precise millimetre margins to remove unwanted borders and blank edges in your browser."],
  "tools/extract-pdf-text.html": ["Extract Text from PDF Online — Free PDF Text Extractor | FreePDF Tools", "Extract selectable text from a PDF in your browser so you can copy or download the text without uploading the document."],
  "tools/pdf-to-word.html": ["PDF to Word Converter Free — PDF to DOCX & OCR | FreePDF Tools", "Convert PDF to Word or PDF to DOCX locally. Optionally OCR scanned pages with English, German, French or Spanish language models without uploading the PDF."],
  "tools/word-to-pdf.html": ["Word to PDF Converter Free — DOC & DOCX | FreePDF Tools", "Convert Word to PDF, DOC to PDF or DOCX to PDF online for free, including Microsoft Word 97–2003 DOC files. Supported documents are processed locally in your browser."],
  "tools/compress-pdf.html": ["Compress PDF Online Free — Reduce PDF Size | FreePDF Tools", "Compress PDF files online free in your browser. Reduce PDF file size with a lossless local pass and download a smaller copy without uploading the original document."],
  "tools/ocr-pdf.html": ["OCR PDF Online Free — 4 Local OCR Languages | FreePDF Tools", "OCR scanned PDF files locally in your browser with English, German, French or Spanish recognition. Download editable Word DOCX or plain text without uploading the source document."],
  "guides/index.html": ["PDF Guides — Merge, Split, Convert & Manage | FreePDF Tools", "Practical PDF guides covering merging, splitting, unlocking, rotation, image conversion, watermarking, page organization and privacy."],
  "guides/reduce-pdf-file-size-for-email.html": ["Compress PDF for Email — Reduce PDF Size Safely | FreePDF Tools", "Learn how to compress or reduce PDF file size for email, when page extraction helps, what a PDF size reducer can actually change, and when true compression is required."],
  "guides/merge-pdf-safely.html": ["How to Merge PDFs Safely — Step-by-Step PDF Guide | FreePDF Tools", "Learn how to combine PDF files in the right order, avoid common mistakes and merge documents locally in your browser."],
  "guides/split-extract-pdf-pages.html": ["How to Split and Extract PDF Pages — Complete Guide | FreePDF Tools", "Learn practical ways to split a PDF, extract selected pages and create separate documents while keeping source files on your device."],
  "guides/unlock-password-protected-pdf.html": ["How to Unlock a Password-Protected PDF Safely | FreePDF Tools", "Learn how to unlock a PDF when you know its password, what limitations apply and how local browser processing protects the source file."],
  "guides/rotate-pdf-pages.html": ["How to Rotate PDF Pages — Fix Sideways Documents | FreePDF Tools", "Learn how to rotate individual or multiple PDF pages, choose the right angle and save a corrected document."],
  "guides/jpg-png-to-pdf.html": ["How to Convert JPG or PNG to PDF — Practical Guide | FreePDF Tools", "Learn how to turn images into PDF documents, choose page sizes and arrange multiple images before creating the final file."],
  "guides/pdf-to-jpg-vs-png.html": ["PDF vs JPG vs PNG — Which Image Format Should You Use? | FreePDF Tools", "Compare PDF, JPG and PNG for quality, file size, text clarity, screenshots, printing and sharing, and choose the right format for each PDF workflow."],
  "guides/watermark-pdf-documents.html": ["How to Watermark PDF Documents — Practical Guide | FreePDF Tools", "Learn how to add readable text watermarks to PDFs, choose placement and opacity, and create the result in your browser."],
  "guides/organize-pdf-pages.html": ["How to Reorder PDF Pages Free — Rearrange & Delete | FreePDF Tools", "Learn how to reorder, rearrange and delete PDF pages for free, check the final sequence and save a clean copy without uploading the source file."],
  "guides/add-page-numbers-to-pdf.html": ["How to Add Page Numbers to a PDF — Step-by-Step Guide | FreePDF Tools", "Learn how to number PDF pages, choose placement and style, and create a numbered copy directly in your browser."],
  "guides/remove-pdf-metadata.html": ["How to Remove PDF Metadata — Privacy and Sharing Guide | FreePDF Tools", "Learn which common PDF metadata fields can be removed before sharing a document and how to clean them locally in your browser."],
  "guides/crop-pdf-pages.html": ["How to Crop PDF Pages — Remove Borders & Margins | FreePDF Tools", "Learn how to crop PDF pages with precise margins and avoid common mistakes when trimming document edges."],
  "guides/extract-text-from-pdf.html": ["How to Extract Text from a PDF — Step-by-Step Guide | FreePDF Tools", "Learn how to extract selectable PDF text, understand browser limitations and save or copy the resulting text."],
  "guides/are-online-pdf-converters-safe.html": ["Are Online PDF Converters Safe? Privacy Guide | FreePDF Tools", "Understand the privacy tradeoffs of online PDF converters, what file uploads mean, and when local browser processing can help."],
  "guides/pdf-converter-without-upload.html": ["How to Convert PDFs Without Uploading Files | FreePDF Tools", "Learn how browser-based PDF processing works, why files can stay on your device, and when local conversion is useful."],
  "guides/pdf-to-word-converter.html": ["How to Convert PDF to Word — Editable DOCX Guide | FreePDF Tools", "Learn how to convert text-based PDFs to editable Word DOCX files, what happens to tables and layout, and why scanned PDFs may need OCR."],
  "guides/word-to-pdf-converter.html": ["How to Convert Word to PDF — DOC & DOCX | FreePDF Tools", "Learn how to convert DOC, DOCX and Word 97–2003 files to PDF in your browser, including layout limitations and final quality checks."],
  "guides/compress-pdf.html": ["How to Compress a PDF — Reduce File Size Safely | FreePDF Tools", "Learn how to compress a PDF, what lossless compression can change, why image-heavy files may shrink less and when stronger image optimization is needed."],
  "guides/ocr-pdf-to-word.html": ["How to OCR a Scanned PDF into Word — Complete Guide | FreePDF Tools", "Learn how OCR turns scanned PDF page images into selectable text and an editable Word document, what affects accuracy and how to review the result."],
  "tools/protect-pdf.html": ["Protect PDF Online Free — Password & Encryption | FreePDF Tools", "Protect a PDF with a password and 256-bit encryption in your browser. Choose printing, copying and editing permissions, then download the protected PDF without uploading it."],
  "guides/password-protect-pdf.html": ["How to Password Protect a PDF Safely | FreePDF Tools", "Learn how to password-protect a PDF with 256-bit encryption, separate user and owner passwords, and practical permission settings while keeping the file in your browser."]
  "guides/compress-photo-to-20kb.html": ["How to Compress a Photo to 20KB, 50KB or 100KB | FreePDF Tools", "Learn how to reduce photo dimensions and file size for online forms, how target sizes work, which image formats are efficient, and why exact bytes cannot always be guaranteed."],
  "guides/resize-signature-for-forms.html": ["How to Resize a Signature for Online Forms | FreePDF Tools", "Learn how to crop, resize, clean and compress a signature image for a form while following the specific dimensions and file-size requirements of the receiving application."],
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
