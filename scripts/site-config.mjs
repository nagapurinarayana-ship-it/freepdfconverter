export const indexablePages = [
  "index.html",
  "about.html",
  "tools/merge-pdf.html",
  "tools/split-pdf.html",
  "tools/rotate-pdf.html",
  "tools/jpg-to-pdf.html",
  "tools/pdf-to-image.html",
  "tools/watermark-pdf.html",
  "guides/index.html",
  "guides/merge-pdf-safely.html",
  "guides/split-extract-pdf-pages.html",
  "guides/rotate-pdf-pages.html",
  "guides/jpg-png-to-pdf.html",
  "guides/pdf-to-jpg-vs-png.html",
  "guides/watermark-pdf-documents.html"
];

export const supplementalPages = ["privacy.html", "terms.html", "contact.html"];

export const articlePages = new Set([
  "guides/merge-pdf-safely.html",
  "guides/split-extract-pdf-pages.html",
  "guides/rotate-pdf-pages.html",
  "guides/jpg-png-to-pdf.html",
  "guides/pdf-to-jpg-vs-png.html",
  "guides/watermark-pdf-documents.html"
]);

export const pageLabels = {
  "about.html": "About",
  "privacy.html": "Privacy Policy",
  "terms.html": "Terms of Use",
  "contact.html": "Contact",
  "tools/merge-pdf.html": "Merge PDF",
  "tools/split-pdf.html": "Split PDF",
  "tools/rotate-pdf.html": "Rotate PDF",
  "tools/jpg-to-pdf.html": "JPG and PNG to PDF",
  "tools/pdf-to-image.html": "PDF to JPG or PNG",
  "tools/watermark-pdf.html": "Watermark PDF",
  "guides/index.html": "PDF Guides",
  "guides/merge-pdf-safely.html": "How to Merge PDFs Safely",
  "guides/split-extract-pdf-pages.html": "How to Split and Extract PDF Pages",
  "guides/rotate-pdf-pages.html": "How to Rotate PDF Pages",
  "guides/jpg-png-to-pdf.html": "How to Convert JPG or PNG to PDF",
  "guides/pdf-to-jpg-vs-png.html": "PDF to JPG vs PNG",
  "guides/watermark-pdf-documents.html": "How to Watermark PDF Documents"
};

export function pagePathname(relative) {
  if (relative === "index.html") return "/";
  const withoutIndex = relative.replace(/index\.html$/, "");
  return "/" + withoutIndex.replace(/\.html$/, "");
}
