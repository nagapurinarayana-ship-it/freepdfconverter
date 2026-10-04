import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { toolRegistry } from "./tool-registry.mjs";

const root = process.cwd();

export async function injectToolRegistry(targetFile = path.join(root, "index.html")) {
  let html = await readFile(targetFile, "utf8");
  const start = "<!-- TOOL-REGISTRY:START -->";
  const end = "<!-- TOOL-REGISTRY:END -->";
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);

  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error("index.html is missing TOOL-REGISTRY markers");
  }

  const categoryGroups = [
    {
      id: "pdf-tools",
      kicker: "PDF essentials",
      title: "Work with PDFs",
      description: "Merge, split, edit, secure, clean and organize PDF files.",
      ids: ["merge-pdf","split-pdf","unlock-pdf","protect-pdf","rotate-pdf","organize-pdf","add-page-numbers","remove-pdf-metadata","crop-pdf","extract-pdf-text","compress-pdf","ocr-pdf","sign-pdf","watermark-pdf"]
    },
    {
      id: "converter-tools",
      kicker: "Conversions",
      title: "Convert between formats",
      description: "Move between PDF, Word and image formats in a few clicks.",
      ids: ["jpg-to-pdf","pdf-to-image","pdf-to-word","word-to-pdf"]
    },
    {
      id: "image-tools",
      kicker: "Images & forms",
      title: "Prepare photos and form images",
      description: "Compress, resize and prepare the image files common forms ask for.",
      ids: ["photo-compressor","signature-resizer","passport-id-photo-maker","thumb-impression-resizer","handwritten-declaration-resizer"]
    }
  ];

  const cardsFor = (tools) => tools
    .filter((tool) => tool.home !== false)
    .map((tool) => {
      const href = tool.path.replace(/\.html$/i, "");
      return [
        '<a class="tool-card" href="' + href + '">',
        '<span class="tool-icon">' + escapeHtml(tool.icon) + "</span>",
        "<h3>" + escapeHtml(tool.label) + "</h3>",
        "<p>" + escapeHtml(tool.description) + "</p>",
        '<span class="go" aria-hidden="true">→</span>',
        "</a>"
      ].join("");
    })
    .join("\n");

  const cards = categoryGroups.map((group) => {
    const tools = group.ids.map((id) => toolRegistry.find((tool) => tool.id === id)).filter(Boolean);
    return [
      '<section class="tool-category" id="' + group.id + '">',
      '<div class="tool-category-head"><div><div class="tool-category-kicker">' + group.kicker + '</div><h3>' + group.title + '</h3></div><p>' + tools.length + ' tools</p></div>',
      '<div class="tool-card-grid">',
      cardsFor(tools),
      '</div>',
      '</section>'
    ].join("\n");
  }).join("\n");



  html = html.slice(0, startIndex + start.length) + "\n" + cards + "\n" + html.slice(endIndex);

  html = html.replace(
    /<span class="badge" data-tool-count>.*?<\/span>/,
    '<span class="badge" data-tool-count>' + toolRegistry.length + " free tools</span>"
  );

  await writeFile(targetFile, html, "utf8");
  await normalizeJavaScriptModuleImports(path.join(root, "dist", "assets", "js"));
}

async function normalizeJavaScriptModuleImports(directory) {
  for (const file of await walk(directory)) {
    if (!/\.(?:js|mjs)$/i.test(file)) continue;

    const source = await readFile(file, "utf8");
    const normalized = source.replace(
      /(\bfrom\s*["']|\bimport\s*\(\s*["'])(\.\.?\/[^"']+)(["']\s*\)?)/g,
      (full, prefix, specifier, suffix) => {
        const target = path.resolve(path.dirname(file), specifier);
        const relative = path.relative(root, target).split(path.sep).join("/");

        if (!relative.startsWith("assets/js/") || !existsSync(target)) return full;
        return prefix + "/" + relative + suffix;
      }
    );

    if (normalized !== source) await writeFile(file, normalized, "utf8");
  }
}

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

if (import.meta.url === new URL("file://" + process.argv[1]).href) {
  await injectToolRegistry();
}
