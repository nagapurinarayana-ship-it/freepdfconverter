import { toolRegistry } from "./tool-registry.mjs";

export const indexablePages = [
  "index.html",
  "pdf-converter-online.html",
  "about.html",
  "how-local-processing.html",
  "unlock-pdf-online.html",
  "merge-pdf-online.html",
  "split-pdf-online.html",
  "jpg-to-pdf-online.html",
  "rotate-pdf-online.html",
  "crop-pdf-online.html",
  "remove-pdf-metadata-online.html",
  ...toolRegistry.map((tool) => tool.path),
  "guides/index.html",
  "guides/reduce-pdf-file-size-for-email.html",
  "guides/compress-pdf.html",
  "guides/merge-pdf-safely.html",
  "guides/split-extract-pdf-pages.html",
  "guides/unlock-password-protected-pdf.html",
  "guides/rotate-pdf-pages.html",
  "guides/jpg-png-to-pdf.html",
  "guides/pdf-to-jpg-vs-png.html",
  "guides/watermark-pdf-documents.html",
  "guides/organize-pdf-pages.html",
  "guides/add-page-numbers-to-pdf.html",
  "guides/remove-pdf-metadata.html",
  "guides/crop-pdf-pages.html",
  "guides/extract-text-from-pdf.html",
  "guides/are-online-pdf-converters-safe.html",
  "guides/pdf-converter-without-upload.html",
  "guides/pdf-to-word-converter.html",
  "guides/word-to-pdf-converter.html",
  "guides/ocr-pdf-to-word.html",
  "guides/merge-pdf-on-phone.html",
  "guides/split-pdf-into-separate-files.html",
  "guides/convert-scanned-images-to-pdf.html",
  "guides/keep-pdf-quality-when-combining.html",
  "guides/what-pdf-metadata-contains.html",
  "guides/pdf-to-word-vs-ocr.html",
  "guides/prepare-scanned-pdf-for-ocr.html",
  "guides/reduce-pdf-size-for-upload.html",
  "guides/pdf-too-large-for-email.html",
  "guides/jpg-vs-png-to-pdf.html",
  "guides/pdf-page-size-a4-vs-letter.html",
  "guides/convert-old-doc-to-pdf.html",
  "guides/organize-pdf-pages-on-phone.html",
  "guides/sign-pdf-online.html",
  "guides/password-protect-pdf.html",
  "guides/compress-photo-to-20kb.html",
  "guides/resize-signature-for-forms.html",
  "guides/passport-id-photo-size.html",
  "guides/resize-thumb-impression.html",
  "guides/resize-handwritten-declaration.html",
  ...[
    "topics/index.html",
    "topics/pdf-to-word-without-upload.html",
    "topics/scanned-pdf-to-word.html",
    "topics/pdf-to-word-formatting.html",
    "topics/pdf-to-word-tables.html",
    "topics/doc-to-pdf.html",
    "topics/docx-to-pdf.html",
    "topics/word-97-2003-to-pdf.html",
    "topics/ocr-pdf-online.html",
    "topics/ocr-pdf-accuracy.html",
    "topics/pdf-to-text.html",
    "topics/compress-pdf-to-target-size.html",
    "topics/pdf-to-jpg.html",
    "topics/jpg-to-pdf-on-mobile.html",
    "topics/pdf-page-size.html",
    "topics/pdf-converter-file-formats.html",
    "topics/private-pdf-converter.html",
    "topics/adobe-acrobat-alternative.html",
    "topics/smallpdf-alternative.html",
    "topics/pdf24-alternative.html",
    "topics/image-upload-requirements.html",
    "topics/cloud-vs-browser-pdf-converter.html"
  ]
];

export const supplementalPages = ["privacy.html", "terms.html", "contact.html"];

export const articlePages = new Set([
  "guides/reduce-pdf-file-size-for-email.html",
  "guides/merge-pdf-safely.html",
  "guides/split-extract-pdf-pages.html",
  "guides/unlock-password-protected-pdf.html",
  "guides/rotate-pdf-pages.html",
  "guides/jpg-png-to-pdf.html",
  "guides/pdf-to-jpg-vs-png.html",
  "guides/watermark-pdf-documents.html",
  "guides/organize-pdf-pages.html",
  "guides/add-page-numbers-to-pdf.html",
  "guides/remove-pdf-metadata.html",
  "guides/crop-pdf-pages.html",
  "guides/extract-text-from-pdf.html",
  "guides/pdf-to-word-converter.html",
  "guides/word-to-pdf-converter.html",
  "guides/compress-pdf.html",
  "guides/ocr-pdf-to-word.html",
  "guides/merge-pdf-on-phone.html",
  "guides/split-pdf-into-separate-files.html",
  "guides/convert-scanned-images-to-pdf.html",
  "guides/keep-pdf-quality-when-combining.html",
  "guides/what-pdf-metadata-contains.html",
  "guides/pdf-to-word-vs-ocr.html",
  "guides/prepare-scanned-pdf-for-ocr.html",
  "guides/reduce-pdf-size-for-upload.html",
  "guides/pdf-too-large-for-email.html",
  "guides/jpg-vs-png-to-pdf.html",
  "guides/pdf-page-size-a4-vs-letter.html",
  "guides/convert-old-doc-to-pdf.html",
  "guides/organize-pdf-pages-on-phone.html",
  "guides/sign-pdf-online.html",
  "guides/password-protect-pdf.html",
  "guides/compress-photo-to-20kb.html",
  "guides/resize-signature-for-forms.html",
  "guides/passport-id-photo-size.html",
  "guides/resize-thumb-impression.html",
  "guides/resize-handwritten-declaration.html"
]);

export const pageDates = Object.fromEntries(indexablePages.map((relative) => [relative, "2026-08-13"]));
pageDates["index.html"] = "2026-10-02";
pageDates["pdf-converter-online.html"] = "2026-09-27";
pageDates["about.html"] = "2026-10-02";
pageDates["guides/index.html"] = "2026-10-02";
pageDates["guides/reduce-pdf-file-size-for-email.html"] = "2026-08-31";
pageDates["tools/organize-pdf.html"] = "2026-09-27";
pageDates["guides/organize-pdf-pages.html"] = "2026-09-27";
pageDates["guides/pdf-to-jpg-vs-png.html"] = "2026-09-27";
pageDates["tools/pdf-to-word.html"] = "2026-09-27";
pageDates["tools/word-to-pdf.html"] = "2026-09-27";
pageDates["guides/are-online-pdf-converters-safe.html"] = "2026-08-12";
pageDates["guides/pdf-converter-without-upload.html"] = "2026-08-12";
pageDates["guides/pdf-to-word-converter.html"] = "2026-09-27";
pageDates["guides/word-to-pdf-converter.html"] = "2026-09-27";
pageDates["tools/compress-pdf.html"] = "2026-09-28";
pageDates["guides/compress-pdf.html"] = "2026-09-28";
pageDates["tools/ocr-pdf.html"] = "2026-09-28";
pageDates["tools/sign-pdf.html"] = "2026-10-02";
pageDates["guides/sign-pdf-online.html"] = "2026-10-02";
pageDates["tools/protect-pdf.html"] = "2026-10-02";
pageDates["guides/password-protect-pdf.html"] = "2026-10-02";
pageDates["guides/ocr-pdf-to-word.html"] = "2026-09-28";
pageDates["guides/merge-pdf-on-phone.html"] = "2026-09-28";
pageDates["guides/split-pdf-into-separate-files.html"] = "2026-09-28";
pageDates["guides/convert-scanned-images-to-pdf.html"] = "2026-09-28";
pageDates["guides/keep-pdf-quality-when-combining.html"] = "2026-09-28";
pageDates["guides/what-pdf-metadata-contains.html"] = "2026-09-28";
pageDates["guides/pdf-to-word-vs-ocr.html"] = "2026-09-28";
pageDates["guides/prepare-scanned-pdf-for-ocr.html"] = "2026-09-28";
pageDates["guides/reduce-pdf-size-for-upload.html"] = "2026-09-28";
pageDates["guides/pdf-too-large-for-email.html"] = "2026-09-28";
pageDates["guides/jpg-vs-png-to-pdf.html"] = "2026-09-28";
pageDates["guides/pdf-page-size-a4-vs-letter.html"] = "2026-09-28";
pageDates["guides/convert-old-doc-to-pdf.html"] = "2026-09-28";
pageDates["guides/organize-pdf-pages-on-phone.html"] = "2026-09-28";
pageDates["guides/passport-id-photo-size.html"] = "2026-10-05";
pageDates["guides/resize-thumb-impression.html"] = "2026-10-05";
pageDates["guides/resize-handwritten-declaration.html"] = "2026-10-05";
for (const localizedTopicKey of [
  "topic-pdf-word-private","topic-scanned-pdf-word","topic-pdf-word-formatting","topic-ocr-pdf-online","topic-ocr-pdf-accuracy","topic-word-97-2003-pdf","topic-docx-to-pdf","topic-private-pdf","topic-pdf-to-text","topic-compress-target","topic-jpg-mobile","topic-pdf-page-size"
]) pageDates[localizedTopicKey] = "2026-09-28";
for (const relative of [
  "topics/image-upload-requirements.html",
  "topics/adobe-acrobat-alternative.html",
  "topics/smallpdf-alternative.html",
  "topics/pdf24-alternative.html",
  "topics/cloud-vs-browser-pdf-converter.html",
  "topics/index.html",
  "topics/pdf-to-word-without-upload.html",
  "topics/scanned-pdf-to-word.html",
  "topics/pdf-to-word-formatting.html",
  "topics/pdf-to-word-tables.html",
  "topics/doc-to-pdf.html",
  "topics/docx-to-pdf.html",
  "topics/word-97-2003-to-pdf.html",
  "topics/ocr-pdf-online.html",
  "topics/ocr-pdf-accuracy.html",
  "topics/pdf-to-text.html",
  "topics/compress-pdf-to-target-size.html",
  "topics/pdf-to-jpg.html",
  "topics/jpg-to-pdf-on-mobile.html",
  "topics/pdf-page-size.html",
  "topics/pdf-converter-file-formats.html",
  "topics/private-pdf-converter.html"
]) pageDates[relative] = "2026-09-28";

for (const tool of toolRegistry) {
  if (tool.lastmod) pageDates[tool.path] = tool.lastmod;
}

export const articlePublishedDates = {
  "guides/reduce-pdf-file-size-for-email.html": "2026-08-31",
  "guides/merge-pdf-safely.html": "2026-08-09",
  "guides/split-extract-pdf-pages.html": "2026-08-09",
  "guides/unlock-password-protected-pdf.html": "2026-08-11",
  "guides/rotate-pdf-pages.html": "2026-08-09",
  "guides/jpg-png-to-pdf.html": "2026-08-09",
  "guides/pdf-to-jpg-vs-png.html": "2026-08-09",
  "guides/watermark-pdf-documents.html": "2026-08-09",
  "guides/organize-pdf-pages.html": "2026-08-11",
  "guides/add-page-numbers-to-pdf.html": "2026-08-11",
  "guides/remove-pdf-metadata.html": "2026-08-11",
  "guides/crop-pdf-pages.html": "2026-08-11",
  "guides/extract-text-from-pdf.html": "2026-08-11",
  "guides/pdf-to-word-converter.html": "2026-09-27",
  "guides/word-to-pdf-converter.html": "2026-09-27",
  "guides/compress-pdf.html": "2026-09-28",
  "guides/ocr-pdf-to-word.html": "2026-09-28",
  "guides/merge-pdf-on-phone.html": "2026-09-28",
  "guides/split-pdf-into-separate-files.html": "2026-09-28",
  "guides/convert-scanned-images-to-pdf.html": "2026-09-28",
  "guides/keep-pdf-quality-when-combining.html": "2026-09-28",
  "guides/what-pdf-metadata-contains.html": "2026-09-28",
  "guides/pdf-to-word-vs-ocr.html": "2026-09-28",
  "guides/prepare-scanned-pdf-for-ocr.html": "2026-09-28",
  "guides/reduce-pdf-size-for-upload.html": "2026-09-28",
  "guides/pdf-too-large-for-email.html": "2026-09-28",
  "guides/jpg-vs-png-to-pdf.html": "2026-09-28",
  "guides/pdf-page-size-a4-vs-letter.html": "2026-09-28",
  "guides/convert-old-doc-to-pdf.html": "2026-09-28",
  "guides/organize-pdf-pages-on-phone.html": "2026-09-28",
  "guides/password-protect-pdf.html": "2026-10-02",
  "guides/compress-photo-to-20kb.html": "2026-10-03",
  "guides/resize-signature-for-forms.html": "2026-10-03",
  "guides/passport-id-photo-size.html": "2026-10-03",
  "guides/resize-thumb-impression.html": "2026-10-03",
  "guides/resize-handwritten-declaration.html": "2026-10-03"
};

export const pageLabels = {
  "pdf-converter-online.html": "Free PDF Converter Online",
  "about.html": "About",
  "how-local-processing.html": "How Local PDF Processing Works",
  "unlock-pdf-online.html": "Unlock PDF Online",
  "merge-pdf-online.html": "Merge PDF Online",
  "split-pdf-online.html": "Split PDF Online",
  "jpg-to-pdf-online.html": "JPG to PDF Online",
  "rotate-pdf-online.html": "Rotate PDF Online",
  "crop-pdf-online.html": "Crop PDF Online",
  "remove-pdf-metadata-online.html": "Remove PDF Metadata Online",
  "privacy.html": "Privacy Policy",
  "terms.html": "Terms of Use",
  "contact.html": "Contact",
  "tools/merge-pdf.html": "Merge PDF",
  "tools/split-pdf.html": "Split PDF",
  "tools/unlock-pdf.html": "Unlock PDF",
  "tools/rotate-pdf.html": "Rotate PDF",
  "tools/jpg-to-pdf.html": "JPG and PNG to PDF",
  "tools/pdf-to-image.html": "PDF to JPG or PNG",
  "tools/watermark-pdf.html": "Watermark PDF",
  "tools/organize-pdf.html": "Organize PDF Pages",
  "tools/add-page-numbers.html": "Add Page Numbers to PDF",
  "tools/remove-pdf-metadata.html": "Remove PDF Metadata",
  "tools/crop-pdf.html": "Crop PDF Pages",
  "tools/extract-pdf-text.html": "Extract PDF Text",
  "tools/pdf-to-word.html": "PDF to Word",
  "tools/word-to-pdf.html": "Word to PDF",
  "tools/compress-pdf.html": "Compress PDF",
  "tools/ocr-pdf.html": "OCR PDF",
  "tools/sign-pdf.html": "Sign PDF",
  "tools/protect-pdf.html": "Protect PDF",
  "guides/index.html": "PDF Guides",
  "guides/reduce-pdf-file-size-for-email.html": "Reduce PDF File Size for Email",
  "guides/merge-pdf-safely.html": "How to Merge PDFs Safely",
  "guides/split-extract-pdf-pages.html": "How to Split and Extract PDF Pages",
  "guides/unlock-password-protected-pdf.html": "How to Unlock a Password-Protected PDF Safely",
  "guides/rotate-pdf-pages.html": "How to Rotate PDF Pages",
  "guides/jpg-png-to-pdf.html": "How to Convert JPG or PNG to PDF",
  "guides/pdf-to-jpg-vs-png.html": "PDF to JPG vs PNG",
  "guides/watermark-pdf-documents.html": "How to Watermark PDF Documents",
  "guides/organize-pdf-pages.html": "How to Organize PDF Pages",
  "guides/add-page-numbers-to-pdf.html": "How to Add Page Numbers to a PDF",
  "guides/remove-pdf-metadata.html": "How to Remove PDF Metadata",
  "guides/crop-pdf-pages.html": "How to Crop PDF Pages",
  "guides/extract-text-from-pdf.html": "How to Extract Text from a PDF",
  "guides/are-online-pdf-converters-safe.html": "Are Online PDF Converters Safe?",
  "guides/pdf-converter-without-upload.html": "How to Convert PDFs Without Uploading Files",
  "guides/pdf-to-word-converter.html": "How to Convert PDF to Word",
  "guides/word-to-pdf-converter.html": "How to Convert Word to PDF",
  "guides/compress-pdf.html": "How to Compress a PDF",
  "guides/ocr-pdf-to-word.html": "How to OCR a Scanned PDF into Word",
  "guides/merge-pdf-on-phone.html": "How to Merge PDFs on a Phone",
  "guides/split-pdf-into-separate-files.html": "How to Split a PDF into Separate Files",
  "guides/convert-scanned-images-to-pdf.html": "Convert Scanned Images to PDF",
  "guides/keep-pdf-quality-when-combining.html": "Merge PDFs Without Losing Quality",
  "guides/what-pdf-metadata-contains.html": "What PDF Metadata Contains",
  "guides/pdf-to-word-vs-ocr.html": "PDF to Word vs OCR",
  "guides/prepare-scanned-pdf-for-ocr.html": "Prepare a Scanned PDF for OCR",
  "guides/reduce-pdf-size-for-upload.html": "Reduce PDF Size for Upload",
  "guides/pdf-too-large-for-email.html": "PDF Too Large for Email",
  "guides/jpg-vs-png-to-pdf.html": "JPG vs PNG for PDF",
  "guides/pdf-page-size-a4-vs-letter.html": "PDF Page Size: A4 vs Letter",
  "guides/convert-old-doc-to-pdf.html": "Convert Old DOC Files to PDF",
  "guides/organize-pdf-pages-on-phone.html": "Organize PDF Pages on a Phone",
  "guides/sign-pdf-online.html": "How to Sign a PDF Online Without Uploading It",
  "guides/password-protect-pdf.html": "How to Password Protect a PDF Safely",
  "guides/compress-photo-to-20kb.html": "How to Compress a Photo to 20KB, 50KB or 100KB",
  "guides/resize-signature-for-forms.html": "How to Resize a Signature for Online Forms",
  "guides/passport-id-photo-size.html": "How to Resize a Passport or ID Photo",
  "guides/resize-thumb-impression.html": "How to Resize a Thumb Impression for Online Forms",
  "guides/resize-handwritten-declaration.html": "How to Resize a Handwritten Declaration for an Online Form",
  "topics/index.html": "PDF Conversion Topics",
  "topics/pdf-to-word-without-upload.html": "PDF to Word Without Uploading",
  "topics/scanned-pdf-to-word.html": "Scanned PDF to Word",
  "topics/pdf-to-word-formatting.html": "PDF to Word Formatting",
  "topics/pdf-to-word-tables.html": "PDF to Word Tables",
  "topics/doc-to-pdf.html": "DOC to PDF",
  "topics/docx-to-pdf.html": "DOCX to PDF",
  "topics/word-97-2003-to-pdf.html": "Word 97–2003 to PDF",
  "topics/ocr-pdf-online.html": "OCR PDF Online",
  "topics/ocr-pdf-accuracy.html": "OCR PDF Accuracy",
  "topics/pdf-to-text.html": "PDF to Text",
  "topics/compress-pdf-to-target-size.html": "Compress PDF to a Target Size",
  "topics/pdf-to-jpg.html": "PDF to JPG",
  "topics/jpg-to-pdf-on-mobile.html": "JPG to PDF on Mobile",
  "topics/pdf-page-size.html": "PDF Page Size",
  "topics/pdf-converter-file-formats.html": "PDF Converter File Formats",
  "topics/private-pdf-converter.html": "Private PDF Converter",
  "topics/adobe-acrobat-alternative.html": "Adobe Acrobat Online Alternative",
  "topics/smallpdf-alternative.html": "Smallpdf Alternative",
  "topics/pdf24-alternative.html": "PDF24 Alternative",
  "topics/image-upload-requirements.html": "Image Upload Requirements",
  "topics/cloud-vs-browser-pdf-converter.html": "Cloud vs Browser PDF Converter"
};

for (const tool of toolRegistry) pageLabels[tool.path] = tool.label;

export function pagePathname(relative) {
  if (relative === "index.html") return "/";
  const withoutIndex = relative.replace(/index\.html$/, "");
  return "/" + withoutIndex.replace(/\.html$/, "");
}

