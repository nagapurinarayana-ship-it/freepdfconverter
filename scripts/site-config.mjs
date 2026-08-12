export const indexablePages = [
  "index.html",
  "about.html",
  "how-local-processing.html",
  "unlock-pdf-online.html",
  "merge-pdf-online.html",
  "split-pdf-online.html",
  "jpg-to-pdf-online.html",
  "tools/merge-pdf.html",
  "tools/split-pdf.html",
  "tools/unlock-pdf.html",
  "tools/rotate-pdf.html",
  "tools/jpg-to-pdf.html",
  "tools/pdf-to-image.html",
  "tools/watermark-pdf.html",
  "tools/organize-pdf.html",
  "tools/add-page-numbers.html",
  "tools/remove-pdf-metadata.html",
  "tools/crop-pdf.html",
  "tools/extract-pdf-text.html",
  "guides/index.html",
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
  "guides/pdf-converter-without-upload.html"
];

export const supplementalPages = ["privacy.html", "terms.html", "contact.html"];

export const articlePages = new Set([
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
  "guides/extract-text-from-pdf.html"
]);

export const pageDates = Object.fromEntries(indexablePages.map((relative) => [relative, "2026-08-13"]));
pageDates["guides/are-online-pdf-converters-safe.html"] = "2026-08-12";
pageDates["guides/pdf-converter-without-upload.html"] = "2026-08-12";

export const articlePublishedDates = {
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
  "guides/extract-text-from-pdf.html": "2026-08-11"
};

export const pageLabels = {
  "about.html": "About",
  "how-local-processing.html": "How Local PDF Processing Works",
  "unlock-pdf-online.html": "Unlock PDF Online",
  "merge-pdf-online.html": "Merge PDF Online",
  "split-pdf-online.html": "Split PDF Online",
  "jpg-to-pdf-online.html": "JPG to PDF Online",
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
  "guides/index.html": "PDF Guides",
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
  "guides/pdf-converter-without-upload.html": "How to Convert PDFs Without Uploading Files"
};

export function pagePathname(relative) {
  if (relative === "index.html") return "/";
  const withoutIndex = relative.replace(/index\\.html$/, "");
  return "/" + withoutIndex.replace(/\\.html$/, "");
}
