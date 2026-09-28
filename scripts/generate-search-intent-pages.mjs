import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const SEARCH_INTENT_PAGES = {
  "topics/index.html": {
    title: "PDF Conversion Topics — Word, OCR & Privacy | FreePDF Tools",
    description: "Practical PDF conversion topics covering PDF to Word, scanned PDF OCR, Word to PDF, privacy, file formats, compression, images and page-size decisions.",
    h1: "PDF conversion topics and practical answers",
    intro: "Use these topic pages to understand the PDF workflow you need before opening a converter. Each topic explains the common problem, important limitations and the matching FreePDF Tools workflow.",
    sections: [
      ["PDF to Word and editable documents", "Learn when a text-based PDF can become an editable DOCX, when OCR is required, how tables and layout behave, and how to keep supported conversions in the browser."],
      ["Scanned PDFs and OCR", "Scanned PDFs are image pages rather than normal text documents. These topics explain OCR, recognition accuracy, review steps and the path from a scan to editable text."],
      ["Word, DOC and DOCX conversion", "Understand DOC, DOCX and legacy Microsoft Word 97–2003 files, conversion tradeoffs and the checks worth making before sending a generated PDF."],
      ["Privacy and browser-local conversion", "Understand what local processing means, what still travels over the network to deliver a website, and how document bytes differ from ordinary hosting requests."],
      ["PDF images, page size and compression", "Choose JPG or PNG output, select practical PDF page sizes and understand why some PDFs compress dramatically while others barely shrink."]
    ]
  },

  "topics/pdf-to-word-without-upload.html": {
    title: "PDF to Word Without Upload — Browser Conversion | FreePDF Tools",
    description: "Learn how browser-local PDF to Word conversion can keep supported document bytes on your device, what the workflow can and cannot preserve, and when OCR is needed.",
    h1: "Convert PDF to Word without uploading the document",
    intro: "A browser-local PDF to Word workflow can be useful when the document is sensitive and the PDF contains a normal selectable text layer. The important distinction is between loading the website and uploading the document itself.",
    sections: [
      ["How local PDF to Word works", "The browser downloads the application and its document-processing libraries. When you select a supported PDF, the conversion code can read the document from browser memory and build the DOCX locally. The generated file is then offered back to your browser for download."],
      ["What this approach does not mean", "Your device still makes ordinary network requests for the website, fonts or other public assets, and hosting providers can receive technical request information. Local document processing means the selected document bytes are not intentionally sent to the application's conversion server for the supported workflow."],
      ["When OCR is required", "If you cannot select or copy the words inside the PDF, the page may be a scan or image-only document. Use the OCR workflow first. OCR creates recognized text, but it can introduce recognition errors that must be reviewed."],
      ["Practical checks", "Open the DOCX after conversion. Check headings, tables, page breaks, numbers, links and unusual characters. Keep the original PDF until the editable copy has been reviewed."]
    ],
    tool: ["/tools/pdf-to-word","PDF to Word"],
    guides: [["/guides/pdf-to-word-converter","PDF to Word guide"],["/guides/pdf-converter-without-upload","No-upload processing guide"],["/guides/ocr-pdf-to-word","Scanned PDF OCR guide"]]
  },

  "topics/scanned-pdf-to-word.html": {
    title: "Scanned PDF to Word with OCR | FreePDF Tools",
    description: "Learn how to turn a scanned or image-only PDF into an editable Word document with OCR, including accuracy limits, tables, columns and review steps.",
    h1: "Scanned PDF to Word: use OCR before editing",
    intro: "A scanned PDF is usually a set of page images. A normal PDF-to-Word text extractor cannot invent text that is not present in a text layer. OCR is the bridge between the image and editable text.",
    sections: [
      ["Identify a scanned PDF", "Try selecting a sentence. If the whole page behaves like one image and text selection is unavailable, treat it as an image-based PDF. Mixed documents can contain both scanned pages and normal text pages."],
      ["Run OCR", "The OCR workflow renders the PDF pages and recognizes visible characters. The result can be delivered as editable DOCX or plain text. The output is a reconstruction based on recognition, not a visual copy of the original page."],
      ["Review high-risk content", "Names, account numbers, dates, punctuation, tables, multi-column pages and low-contrast scans deserve manual checking. A clean scan at a reasonable resolution generally gives OCR more useful input than a skewed or noisy image."],
      ["Continue in Word", "After OCR, open the DOCX and correct recognition errors before using the file as an official or professional document."]
    ],
    tool: ["/tools/ocr-pdf","OCR PDF"],
    guides: [["/guides/ocr-pdf-to-word","OCR scanned PDF guide"],["/guides/pdf-to-word-converter","PDF to Word guide"],["/guides/extract-text-from-pdf","PDF text extraction guide"]]
  },

  "topics/pdf-to-word-formatting.html": {
    title: "PDF to Word Formatting — What Changes | FreePDF Tools",
    description: "Understand PDF to Word formatting limits for text, tables, columns, images, fonts, page breaks and fixed-layout content before you edit the DOCX result.",
    h1: "PDF to Word formatting: what to expect",
    intro: "PDF is designed to describe a fixed page appearance, while Word is designed for editable document structure. Conversion therefore involves interpretation rather than a guaranteed pixel-perfect reconstruction.",
    sections: [
      ["Text usually transfers best", "Selectable text with a simple reading order is the easiest starting point. Headings and paragraphs can still require adjustment because a PDF may store positioning information rather than Word-style semantic structure."],
      ["Tables and columns need checking", "Tables, side-by-side columns and text boxes can be represented as positioned elements in a PDF. A converter may reproduce the content without reproducing every table boundary or column break exactly."],
      ["Images and fonts can change", "Embedded fonts may not exist on the destination device, and images can be positioned differently in an editable document. Review page breaks and line wrapping after opening the DOCX."],
      ["Scans are a separate case", "An image-only PDF requires OCR before there is editable text to transfer. OCR introduces recognition uncertainty in addition to ordinary layout differences."]
    ],
    tool: ["/tools/pdf-to-word","PDF to Word"],
    guides: [["/guides/pdf-to-word-converter","PDF to Word guide"],["/guides/ocr-pdf-to-word","Scanned PDF OCR guide"]]
  },

  "topics/pdf-to-word-tables.html": {
    title: "PDF to Word Tables — What to Check | FreePDF Tools",
    description: "Learn why PDF tables can change during PDF to Word conversion, how to recognize difficult layouts and which parts should be checked in the resulting DOCX.",
    h1: "PDF to Word tables: why layout needs review",
    intro: "A visual table in a PDF does not always contain the same structural information as a Word table. Lines, spacing and positioned text can look like a table to a person while remaining independent PDF objects.",
    sections: [
      ["Simple tables", "A table with consistent rows, columns and selectable text has a better chance of producing a useful editable structure. Still verify cell boundaries and row alignment."],
      ["Difficult layouts", "Merged cells, nested tables, rotated text, tight spacing, scanned pages and multi-column reports are harder. A visually correct PDF may need manual rebuilding after conversion."],
      ["Numbers require extra care", "Check decimal separators, negative values, dates, account identifiers and totals. A visually similar value is not sufficient for financial or official use."],
      ["Scanned tables", "When a table exists only as an image, use OCR first. OCR can recognize the words without reliably reconstructing spreadsheet-like cell relationships, so manual table cleanup may remain necessary."]
    ],
    tool: ["/tools/pdf-to-word","PDF to Word"],
    guides: [["/guides/pdf-to-word-converter","PDF to Word guide"],["/guides/ocr-pdf-to-word","OCR guide"]]
  },

  "topics/doc-to-pdf.html": {
    title: "DOC to PDF — Word 97-2003 Files | FreePDF Tools",
    description: "Convert supported legacy Microsoft Word 97–2003 DOC files to PDF in the browser and understand the layout checks needed for older documents.",
    h1: "DOC to PDF: converting older Microsoft Word files",
    intro: "Older Word documents use a different file format from modern DOCX files. Supporting the legacy .doc format is useful when an archive contains documents created with Microsoft Word 97–2003.",
    sections: [
      ["What .doc means", "The .doc format is the older binary Word document family. It should not be treated as a renamed DOCX file, so conversion requires an appropriate parser rather than a simple extension change."],
      ["Browser conversion", "FreePDF Tools uses a pinned browser-based document parser for supported legacy DOC files, then generates the PDF locally. The source document does not need to be sent to a conversion server for the supported workflow."],
      ["What to review", "Older Word documents can contain unusual fonts, floating objects, legacy layout features or embedded content. Compare the generated PDF with the source before sharing or archiving it."],
      ["When DOCX is preferable", "For newer documents, DOCX is generally a more current Word format and can contain modern document structures more directly. Convert legacy files when compatibility requires it, but keep the original."]
    ],
    tool: ["/tools/word-to-pdf","Word to PDF"],
    guides: [["/guides/word-to-pdf-converter","Word to PDF guide"],["/about","Supported format overview"]]
  },

  "topics/docx-to-pdf.html": {
    title: "DOCX to PDF Online — Browser Guide | FreePDF Tools",
    description: "Learn how supported DOCX files are converted to PDF in the browser, what formatting to check and how DOCX differs from legacy DOC files.",
    h1: "DOCX to PDF: a practical conversion guide",
    intro: "DOCX is the modern Office Open XML Word document format. Converting it to PDF creates a fixed-layout file that is easier to share consistently, but the generated page appearance still depends on the features used by the source document.",
    sections: [
      ["Why convert DOCX to PDF", "PDF is useful for sharing a document when you want a stable page-oriented result. It is also convenient for printing, submission systems and final review."],
      ["What can change", "Complex fonts, floating objects, page breaks, headers and footers, tracked changes or unusual embedded elements may not reproduce exactly. Always inspect the generated PDF."],
      ["DOCX versus DOC", "DOCX is the modern Word format. Older Microsoft Word 97–2003 files use .doc and need a legacy parser path. Keep the original file for archival purposes."],
      ["Privacy", "The supported browser-local workflow creates the result on the device. This is useful for documents where uploading the source to a remote conversion service would be undesirable."]
    ],
    tool: ["/tools/word-to-pdf","Word to PDF"],
    guides: [["/guides/word-to-pdf-converter","Word to PDF guide"],["/guides/pdf-converter-without-upload","No-upload guide"]]
  },

  "topics/word-97-2003-to-pdf.html": {
    title: "Word 97-2003 to PDF — Legacy DOC | FreePDF Tools",
    description: "Convert supported Microsoft Word 97–2003 .doc files to PDF, with notes about parser compatibility, formatting checks and browser-local processing.",
    h1: "Word 97–2003 to PDF: legacy DOC conversion",
    intro: "Archives often contain .doc files from Microsoft Word 97–2003. They are still useful documents, but their binary format needs different parsing from modern DOCX files.",
    sections: [
      ["Use the correct file type", "Select the original .doc file. Renaming a DOC file to .docx does not convert its internal format and can make the file harder to diagnose."],
      ["Check legacy layout", "Review page breaks, tables, fonts, lists and embedded objects in the generated PDF. Old documents may rely on layout behaviour that modern software represents differently."],
      ["Keep the source", "Conversion creates a new output. Preserve the original legacy document when it has archival or evidentiary value."],
      ["Browser-local processing", "The supported converter uses a self-hosted parser and does not need to upload the selected document to an application conversion server."]
    ],
    tool: ["/tools/word-to-pdf","Word to PDF"],
    guides: [["/guides/word-to-pdf-converter","Word to PDF guide"],["/about","About supported document formats"]]
  },

  "topics/ocr-pdf-online.html": {
    title: "OCR PDF Online — Scanned PDF to Text | FreePDF Tools",
    description: "Learn how browser-based OCR turns scanned PDF page images into recognized text, editable Word or TXT files and what affects recognition quality.",
    h1: "OCR PDF online: turn scanned pages into text",
    intro: "OCR, or optical character recognition, analyzes visible characters in an image and produces text that can be selected, copied or placed into an editable document.",
    sections: [
      ["When OCR is useful", "Use OCR when a PDF contains scans, screenshots or image-only pages and normal text extraction returns little or nothing."],
      ["What the browser does", "The workflow renders each PDF page, runs a local OCR engine over the page image and builds the requested output. Processing can use significant memory, especially for large scans."],
      ["What OCR can get wrong", "Recognition can confuse similar characters, miss faint marks and struggle with skew, noise, handwriting, dense tables or multi-column layouts. Review the result before relying on it."],
      ["Text versus Word output", "TXT is a simple recognized-text result. DOCX is more useful when you need editing, but it remains a reconstruction of the recognized content rather than a visual copy of the original page."]
    ],
    tool: ["/tools/ocr-pdf","OCR PDF"],
    guides: [["/guides/ocr-pdf-to-word","OCR to Word guide"],["/guides/extract-text-from-pdf","Text extraction guide"]]
  },

  "topics/ocr-pdf-accuracy.html": {
    title: "OCR PDF Accuracy — What Affects Results | FreePDF Tools",
    description: "Understand the factors that influence PDF OCR accuracy, including scan resolution, skew, contrast, columns, tables and character quality.",
    h1: "OCR PDF accuracy: the factors that matter",
    intro: "OCR quality is determined by the input image as much as the recognition engine. Improving the source page often helps more than changing the output format.",
    sections: [
      ["Image quality", "Clear, sufficiently large text with good contrast gives OCR more information. Tiny or heavily compressed characters leave less useful detail for recognition."],
      ["Skew and orientation", "Straight pages are easier to analyze than rotated or skewed scans. Fix orientation before OCR when the page is obviously sideways."],
      ["Columns and tables", "Multiple columns and grid-heavy layouts can confuse reading order. Review the sequence of recognized paragraphs and verify table data separately."],
      ["Numbers and names", "OCR can misread zeros, ones, letter I, punctuation and similar glyphs. Names, identifiers and financial figures should be checked against the source page."]
    ],
    tool: ["/tools/ocr-pdf","OCR PDF"],
    guides: [["/guides/ocr-pdf-to-word","OCR guide"],["/guides/rotate-pdf-pages","Rotate PDF guide"]]
  },

  "topics/pdf-to-text.html": {
    title: "PDF to Text — Extract Selectable Text | FreePDF Tools",
    description: "Learn when direct PDF text extraction works, how scanned pages differ and what to expect from a TXT result.",
    h1: "PDF to text: extract the text layer before using OCR",
    intro: "A PDF with selectable text can often be processed without OCR. Direct extraction is usually simpler because the document already contains character information.",
    sections: [
      ["Text PDF versus scan", "Select a sentence in the viewer. If it highlights as text, direct extraction is the natural first step. If the page is only an image, use OCR instead."],
      ["Reading order", "PDFs store text with positioning instructions. A visually sensible page can still produce text in an unexpected order when columns, sidebars or floating labels are involved."],
      ["What TXT preserves", "Plain text does not preserve fonts, images, exact page layout or table borders. It is best for searching, copying, analysis and simple text reuse."],
      ["A practical workflow", "Extract text first when possible. Use OCR only when necessary. Keep the original PDF and verify important content, especially names, numbers and columns."]
    ],
    tool: ["/tools/extract-pdf-text","Extract PDF text"],
    guides: [["/guides/extract-text-from-pdf","PDF text extraction guide"],["/guides/ocr-pdf-to-word","OCR guide"]]
  },

  "topics/compress-pdf-to-target-size.html": {
    title: "Compress PDF to Target Size — What to Know | FreePDF Tools",
    description: "Learn why a PDF cannot always be reduced to an exact target size and how structure, images and existing compression affect the result.",
    h1: "Compress PDF to a target size: understand the limits",
    intro: "A PDF compressor can reduce file size, but an exact target such as 100 KB is not always achievable without changing image quality or removing content.",
    sections: [
      ["Why PDFs shrink differently", "A text-heavy PDF may contain little redundant structure, while an image-heavy scan can be dominated by JPEG or other already-compressed images. Lossless recompression cannot remove information from those images."],
      ["When lossy optimization is needed", "If a submission system requires a hard file-size limit, you may need image resampling or quality reduction. That is a different tradeoff from lossless compression because visual quality can change."],
      ["Check the result", "Open the compressed PDF, compare text and images, and confirm that forms, links and page count remain correct before replacing the original."],
      ["Use the right workflow", "Start with the lossless browser-local compressor. If the target is still not reached, decide explicitly which visual quality or page content can safely be changed."]
    ],
    tool: ["/tools/compress-pdf","Compress PDF"],
    guides: [["/guides/compress-pdf","Compression guide"],["/guides/reduce-pdf-file-size-for-email","Reduce PDF size for email"]]
  },

  "topics/pdf-to-jpg.html": {
    title: "PDF to JPG — Convert PDF Pages to Images | FreePDF Tools",
    description: "Learn when JPG is useful for PDF pages, how page rendering works and what quality and transparency tradeoffs apply.",
    h1: "PDF to JPG: turn PDF pages into images",
    intro: "Converting PDF pages to JPG is useful when a page must be shared in an image-friendly workflow. Each selected PDF page becomes a raster image rather than an editable PDF page.",
    sections: [
      ["When JPG makes sense", "JPG works well for photographs and image-heavy pages where compact files matter. It is less suitable when crisp text or transparency is the main requirement."],
      ["Rendering changes the file model", "The PDF page is rendered into pixels. Text is no longer selectable in the resulting JPG, and vector graphics become part of the raster image."],
      ["Quality and resolution", "Higher rendering resolution can make small text clearer but produces larger images. Choose a practical resolution for the destination rather than assuming maximum resolution is always better."],
      ["Check each page", "Review the first and last pages and a representative page containing text, graphics or photos before sharing a large batch of images."]
    ],
    tool: ["/tools/pdf-to-image","PDF to Image"],
    guides: [["/guides/pdf-to-jpg-vs-png","PDF to JPG vs PNG guide"]]
  },

  "topics/jpg-to-pdf-on-mobile.html": {
    title: "JPG to PDF on Mobile — Practical Guide | FreePDF Tools",
    description: "Learn how to turn phone photos into a PDF, choose practical page dimensions and keep image-heavy documents manageable in the browser.",
    h1: "JPG to PDF on mobile: a practical workflow",
    intro: "Phone cameras make it easy to collect document photos, receipts and forms. Converting those images to PDF is useful when a submission or sharing workflow expects one page-oriented file.",
    sections: [
      ["Choose the right images", "Use clear, upright photos with enough contrast to read the page. Crop distracting backgrounds when appropriate, but keep the complete document content."],
      ["Page size matters", "A4 and Letter are common choices for document workflows. Image-sized pages can preserve the photo dimensions more directly but may be awkward for printing."],
      ["Keep the PDF manageable", "Large camera images can create a large PDF. If the output is too big for a submission or email limit, use a PDF compression workflow afterward."],
      ["Review before sending", "Open the generated PDF and check page order, orientation, margins and readability. Keep the original photos until the PDF has been accepted."]
    ],
    tool: ["/tools/jpg-to-pdf","JPG to PDF"],
    guides: [["/guides/jpg-png-to-pdf","JPG/PNG to PDF guide"],["/guides/compress-pdf","Compression guide"]]
  },

  "topics/pdf-page-size.html": {
    title: "PDF Page Size — A4, Letter or Image | FreePDF Tools",
    description: "Understand A4, Letter and image-sized PDF pages and choose a practical page size for printing, sharing and photo-based workflows.",
    h1: "PDF page size: A4, Letter or image dimensions?",
    intro: "Page size affects printing, margins and how image-based PDFs look on screen. The best choice depends on whether the source is a document page, a photo or a mixed set.",
    sections: [
      ["A4 versus Letter", "A4 is widely used internationally, while Letter is common in the United States and some other regions. Choosing the expected paper size helps avoid unexpected scaling when printing."],
      ["Image-sized pages", "For photos and screenshots, an image-sized page can avoid adding large margins. The tradeoff is that the resulting PDF may not behave like a conventional printable document."],
      ["Mixed documents", "If a PDF contains pages from different sources, decide whether consistency or faithful image dimensions matter more. Standardizing pages can simplify later printing."],
      ["Review the final PDF", "Check the page dimensions, orientation, margins and text readability before submitting or printing the document."]
    ],
    tool: ["/tools/jpg-to-pdf","JPG to PDF"],
    guides: [["/guides/jpg-png-to-pdf","JPG/PNG to PDF guide"],["/guides/pdf-to-jpg-vs-png","PDF image guide"]]
  },

  "topics/pdf-converter-file-formats.html": {
    title: "PDF Converter File Formats — PDF, Word & Images | FreePDF Tools",
    description: "Understand the supported PDF, Word and image workflows, including legacy DOC, modern DOCX, JPG, PNG and OCR-based scanned document conversion.",
    h1: "PDF converter file formats: what each workflow means",
    intro: "The file extension is only the starting point. The internal structure of a document determines which conversion path is appropriate and what can be preserved.",
    sections: [
      ["PDF", "PDF is page-oriented. A PDF can contain selectable text, vector graphics, images, forms and encryption, or it can consist almost entirely of scanned page images."],
      ["DOC and DOCX", "DOC is the older Microsoft Word binary format used by Word 97–2003. DOCX is the modern Office format. A converter must parse each format correctly; renaming extensions does not convert them."],
      ["JPG and PNG", "JPG is often efficient for photos, while PNG is useful for diagrams, screenshots and sharp text. Image-to-PDF tools put those images into page-oriented PDF containers."],
      ["OCR", "OCR is not a file format. It is a recognition process used when the source page contains image pixels rather than selectable text. The result can then be exported to TXT or DOCX."]
    ],
    tool: ["/pdf-converter-online","PDF Converter"],
    guides: [["/guides/pdf-to-word-converter","PDF to Word guide"],["/guides/word-to-pdf-converter","Word to PDF guide"],["/guides/ocr-pdf-to-word","OCR guide"]]
  },

  "topics/private-pdf-converter.html": {
    title: "Private PDF Converter — Browser-Local Processing | FreePDF Tools",
    description: "Understand private PDF conversion, browser-local processing, document bytes, hosting requests, offline cache behaviour and practical privacy checks.",
    h1: "Private PDF converter: understand browser-local processing",
    intro: "Privacy claims are meaningful only when you can explain what is actually local. This topic separates document processing from the normal network requests required to deliver a website.",
    sections: [
      ["Document processing versus website delivery", "A local converter still needs to download HTML, JavaScript, fonts and processing libraries. The privacy distinction is that supported document bytes remain in browser memory rather than being sent to the application's conversion server."],
      ["Why this matters", "Contracts, invoices, identity documents and internal business files may contain information that users would rather not upload to a remote document-processing service. Local processing can reduce that particular data transfer."],
      ["What is still outside the browser", "Hosting providers can see technical requests needed to serve the website. Advertising and consent systems can also create separate network activity depending on configuration. Those are different from the selected document bytes used by the converter."],
      ["How to verify a tool", "A strong privacy check combines the published architecture with network inspection. The supported converter should create an output locally while the browser network log contains no document upload request to the application's conversion origin."]
    ],
    tool: ["/pdf-converter-online","PDF Converter"],
    guides: [["/guides/pdf-converter-without-upload","No-upload guide"],["/guides/are-online-pdf-converters-safe","Online PDF safety guide"],["/privacy","Privacy Policy"]]
  }
};

export const SEARCH_INTENT_PATHS = Object.keys(SEARCH_INTENT_PAGES);

function pageTemplate(origin, relative, page) {
  const related = [
    page.tool ? `<li><a href="${page.tool[0]}">${escapeHtml(page.tool[1])}</a></li>` : "",
    ...(page.guides || []).map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`)
  ].filter(Boolean).join("");
  const topicLinks = Object.entries(SEARCH_INTENT_PAGES)
    .filter(([key]) => key !== relative && key !== "topics/index.html")
    .slice(0, 5)
    .map(([key, item]) => `<li><a href="/${key.replace(/\\/g, "/")}">${escapeHtml(item.h1)}</a></li>`)
    .join("");
  const canonical = origin + (relative === "topics/index.html" ? "/topics/" : "/" + relative.replace(/\.html$/, ""));
  const isIndex = relative === "topics/index.html";
  const crumbs = isIndex
    ? [{name:"Home",url:origin+"/"},{name:"PDF Topics",url:canonical}]
    : [{name:"Home",url:origin+"/"},{name:"PDF Topics",url:origin+"/topics/"},{name:page.h1,url:canonical}];

  const schema = {
    "@context":"https://schema.org",
    "@type":"WebPage",
    name:page.title,
    description:page.description,
    url:canonical,
    inLanguage:"en",
    isPartOf:{"@type":"WebSite",name:"FreePDF Tools",url:origin+"/"},
    breadcrumb:{"@type":"BreadcrumbList","itemListElement":crumbs.map((c,i)=>({"@type":"ListItem",position:i+1,name:c.name,item:c.url}))}
  };

  const sections = page.sections.map(([heading,text]) => `
<section class="section">
  <div class="container content-narrow">
    <h2>${escapeHtml(heading)}</h2>
    <p>${escapeHtml(text)}</p>
  </div>
</section>`).join("");

  const practicalChecklist = `
  <section class="section">
    <div class="container content-narrow">
      <h2>Practical checklist before you finish</h2>
      <p>Start with the original file and keep a copy until the output has been reviewed. Confirm that the selected workflow matches the source format, then inspect the result for missing text, unexpected page breaks, changed images, incorrect reading order or other layout differences. For important documents, compare key names, dates, numbers and totals with the source. If the workflow involves OCR, manually verify recognized text before relying on it.</p>
    </div>
  </section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeAttr(page.description)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/styles.css">
<script src="/assets/js/common.js" defer></script>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FreePDF Tools">
<meta property="og:title" content="${escapeAttr(page.title)}">
<meta property="og:description" content="${escapeAttr(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${origin}/assets/images/freepdf-tools-social.jpg">
<meta property="og:image:alt" content="FreePDF Tools private browser PDF utilities">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(page.title)}">
<meta name="twitter:description" content="${escapeAttr(page.description)}">
<meta name="twitter:image" content="${origin}/assets/images/freepdf-tools-social.jpg">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="/"><span class="logo-mark" aria-hidden="true">PDF</span><span>FreePDF Tools</span></a>
    <nav class="main-nav" aria-label="Main navigation">
      <a href="/#tools">PDF tools</a><a href="/guides/">Guides</a><a href="/topics/" aria-current="page">Topics</a><a href="/privacy">Privacy</a>
    </nav>
  </div>
</header>
<main id="main">
<article class="article container">
  <!-- freepdf-topic-content:start -->
  <div class="breadcrumbs"><a href="/">Home</a> / <a href="/topics/">PDF Topics</a>${isIndex ? "" : " / " + escapeHtml(page.h1)}</div>
  <span class="eyebrow">PDF topic guide</span>
  <h1>${escapeHtml(page.h1)}</h1>
  <p class="lead">${escapeHtml(page.intro)}</p>
  <p class="updated">Updated September 28, 2026 · FreePDF Tools</p>
  ${sections}
  ${practicalChecklist}
  ${isIndex ? `
  <section class="section"><div class="container content-narrow"><h2>Explore the topic library</h2><div class="guide-grid">${Object.entries(SEARCH_INTENT_PAGES).filter(([key])=>key!=="topics/index.html").map(([key,item])=>`<article class="guide-card"><span class="badge">PDF topic</span><h2>${escapeHtml(item.h1)}</h2><p>${escapeHtml(item.description)}</p><a href="/${key.replace(/\\/g,"/")}">Read topic →</a></article>`).join("")}</div></div></section>` : ""}
  ${!isIndex ? `
  <section class="section"><div class="container content-narrow">
    <h2>Use the related PDF tools</h2>
    <ul class="footer-links">${related}</ul>
  </div></section>
  <section class="section"><div class="container content-narrow">
    <h2>Related PDF topics</h2>
    <ul class="footer-links">${topicLinks}</ul>
  </div></section>` : ""}
</article>
</main>
<footer class="site-footer"><div class="container"><div class="footer-grid"><div><a class="logo" href="/"><span class="logo-mark">PDF</span><span>FreePDF Tools</span></a><p>Practical browser-local PDF tools and guides.</p></div><div><h3>Explore</h3><ul class="footer-links"><li><a href="/#tools">PDF tools</a></li><li><a href="/guides/">Guides</a></li><li><a href="/topics/">Topics</a></li></ul></div><div><h3>Information</h3><ul class="footer-links"><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li><li><a href="/contact">Contact</a></li></ul></div></div><div class="footer-bottom"><span>© <span data-current-year></span> FreePDF Tools</span><span>Browser-local PDF processing</span></div></div></footer>
</body>
</html>`;
}

export async function generateSearchIntentPages(dist, origin) {
  const root = path.join(dist, "topics");
  await mkdir(root, {recursive:true});
  for (const [relative,page] of Object.entries(SEARCH_INTENT_PAGES)) {
    const file = path.join(dist, relative);
    await mkdir(path.dirname(file), {recursive:true});
    await writeFile(file, pageTemplate(origin,relative,page), "utf8");
  }
  console.log(`Generated search-intent topic pages: ${SEARCH_INTENT_PATHS.length}`);
}

function escapeHtml(value) {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
function escapeAttr(value) { return escapeHtml(value).replaceAll("'", "&#39;"); }
