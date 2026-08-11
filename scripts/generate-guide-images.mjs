import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const guides = [
  { slug: "merge-pdf-safely", title: "Merge PDFs safely", steps: ["Choose two or more PDFs", "Put files in final order", "Merge and verify pages"], checks: ["Correct file order", "Unlocked source files", "Originals kept safely"] },
  { slug: "split-extract-pdf-pages", title: "Split or extract pages", steps: ["Choose one PDF", "Set the page range", "Download PDF or ZIP"], checks: ["Page numbers checked", "Range includes every page", "Output opened and reviewed"] },
  { slug: "rotate-pdf-pages", title: "Rotate PDF pages", steps: ["Choose the sideways PDF", "Select range and angle", "Rotate and inspect"], checks: ["90° clockwise is correct", "Only target pages selected", "Text stays sharp"] },
  { slug: "jpg-png-to-pdf", title: "Images to one PDF", steps: ["Choose JPG or PNG files", "Order and size images", "Build and review PDF"], checks: ["Images are in sequence", "Page size is suitable", "Margins leave safe space"] },
  { slug: "pdf-to-jpg-vs-png", title: "PDF pages to images", steps: ["Choose PDF pages", "Select JPG or PNG", "Render and compare"], checks: ["JPG for photographs", "PNG for sharp diagrams", "Resolution fits the use"] },
  { slug: "watermark-pdf-documents", title: "Watermark a PDF", steps: ["Choose the document", "Set text and opacity", "Apply and review every page"], checks: ["Text is unambiguous", "Content stays readable", "Not treated as security"] },
  { slug: "organize-pdf-pages", title: "Organize PDF pages", steps: ["Choose one PDF", "Move or remove pages", "Save the new order"], checks: ["Cover appears first", "Blank pages removed", "Forms and links tested"] },
  { slug: "add-page-numbers-to-pdf", title: "Add page numbers", steps: ["Choose the PDF range", "Set first number and position", "Number and inspect"], checks: ["Cover can stay unnumbered", "Footer does not overlap", "Printed margin is safe"] },
  { slug: "remove-pdf-metadata", title: "Remove PDF metadata", steps: ["Choose a working copy", "Clear standard fields", "Inspect the cleaned PDF"], checks: ["Properties are empty", "Visible names reviewed", "Signatures handled safely"] },
  { slug: "crop-pdf-pages", title: "Crop PDF pages", steps: ["Measure unwanted edges", "Enter four margins", "Crop and check extremes"], checks: ["No text is clipped", "Mixed sizes reviewed", "Not used as redaction"] },
  { slug: "extract-text-from-pdf", title: "Extract PDF text", steps: ["Choose a text-based PDF", "Select a page range", "Copy or download TXT"], checks: ["Text layer exists", "Columns read correctly", "Source pages compared"] }
];

const output = path.join(process.cwd(), "assets", "images", "guides");
await mkdir(output, { recursive: true });
for (const guide of guides) {
  await writeFile(path.join(output, guide.slug + "-steps.svg"), workflowSvg(guide), "utf8");
  await writeFile(path.join(output, guide.slug + "-checks.svg"), checksSvg(guide), "utf8");
}
console.log("Generated " + guides.length * 2 + " original guide visuals.");

function workflowSvg(guide) {
  const cards = guide.steps.map((step, index) => {
    const x = 68 + index * 292;
    return `<g transform="translate(${x} 216)"><rect width="248" height="176" rx="18" fill="#fff" stroke="#d7e2f0"/><circle cx="34" cy="36" r="20" fill="#1f67ff"/><text x="34" y="43" text-anchor="middle" class="number">${index + 1}</text><rect x="28" y="78" width="192" height="11" rx="5.5" fill="#dbe7fb"/><rect x="28" y="101" width="150" height="10" rx="5" fill="#edf2f8"/><text x="28" y="145" class="card">${escapeXml(step)}</text></g>`;
  }).join("");
  return svgShell(guide.title + " — three-step workflow", `
    <text x="68" y="128" class="eyebrow">FREEPDF TOOLS · ON-DEVICE WORKFLOW</text>
    <text x="68" y="176" class="title">${escapeXml(guide.title)}</text>
    ${cards}
    <path d="M316 304h36M608 304h36" stroke="#56c9c3" stroke-width="8" stroke-linecap="round"/>
    <rect x="336" y="440" width="288" height="46" rx="23" fill="#e9fbf8"/><circle cx="366" cy="463" r="12" fill="#21a99f"/><path d="m360 463 4 4 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="388" y="470" class="pill">Document stays in this browser</text>`);
}

function checksSvg(guide) {
  const items = guide.checks.map((item, index) => `<g transform="translate(522 ${224 + index * 70})"><circle cx="18" cy="18" r="18" fill="#dff7f3"/><path d="m10 18 5 5 11-13" fill="none" stroke="#138e87" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="52" y="26" class="check">${escapeXml(item)}</text></g>`).join("");
  return svgShell(guide.title + " — verification checklist", `
    <text x="68" y="128" class="eyebrow">RESULT CHECK · BEFORE YOU SHARE</text>
    <text x="68" y="176" class="title">Verify the output</text>
    <g transform="translate(68 214)"><rect width="386" height="244" rx="22" fill="#fff" stroke="#d7e2f0"/><rect x="38" y="32" width="310" height="34" rx="8" fill="#e9f0ff"/><rect x="38" y="92" width="250" height="12" rx="6" fill="#b9cff6"/><rect x="38" y="120" width="300" height="10" rx="5" fill="#e4eaf2"/><rect x="38" y="144" width="286" height="10" rx="5" fill="#e4eaf2"/><rect x="38" y="168" width="218" height="10" rx="5" fill="#e4eaf2"/><rect x="248" y="198" width="100" height="28" rx="14" fill="#1f67ff"/><text x="298" y="218" text-anchor="middle" class="buttonText">DOWNLOAD</text></g>
    ${items}
    <text x="522" y="452" class="caption">Open the result in a separate viewer.</text>`);
}

function svgShell(label, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="${escapeXml(label)}">
  <defs><linearGradient id="bg" x1="0" x2="1"><stop stop-color="#f6f9ff"/><stop offset="1" stop-color="#edf7f7"/></linearGradient><style>.title{font:700 34px Arial,sans-serif;fill:#14243a}.eyebrow{font:700 14px Arial,sans-serif;letter-spacing:1.5px;fill:#1f67ff}.card{font:700 16px Arial,sans-serif;fill:#263b54}.number,.buttonText{font:700 14px Arial,sans-serif;fill:#fff}.pill{font:700 14px Arial,sans-serif;fill:#147b75}.check{font:700 18px Arial,sans-serif;fill:#263b54}.caption{font:400 15px Arial,sans-serif;fill:#62758c}</style></defs>
  <rect width="960" height="540" rx="24" fill="url(#bg)"/><rect x="28" y="26" width="904" height="54" rx="14" fill="#102039"/><circle cx="58" cy="53" r="7" fill="#ff776d"/><circle cx="80" cy="53" r="7" fill="#ffd66d"/><circle cx="102" cy="53" r="7" fill="#5dd49a"/><rect x="150" y="40" width="710" height="27" rx="13.5" fill="#263a57"/><text x="174" y="59" font-family="Arial,sans-serif" font-size="13" fill="#b9c7da">freepdfconverter-all-in-one.pages.dev</text>${content}</svg>\n`;
}

function escapeXml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
