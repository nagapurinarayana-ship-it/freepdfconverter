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
      id: "pdf",
      title: "PDF tools",
      kicker: "Everything for PDFs",
      ids: ["merge-pdf","split-pdf","unlock-pdf","protect-pdf","rotate-pdf","organize-pdf","add-page-numbers","remove-pdf-metadata","crop-pdf","extract-pdf-text","compress-pdf","ocr-pdf","sign-pdf","watermark-pdf"]
    },
    {
      id: "converters",
      title: "Converters",
      kicker: "Change file formats",
      ids: ["jpg-to-pdf","pdf-to-image","pdf-to-word","word-to-pdf"]
    },
    {
      id: "images",
      title: "Images & forms",
      kicker: "Prepare photos for forms",
      ids: ["photo-compressor","signature-resizer","passport-id-photo-maker","thumb-impression-resizer","handwritten-declaration-resizer"]
    }
  ];

  const popularIds = [
    "merge-pdf",
    "split-pdf",
    "compress-pdf",
    "jpg-to-pdf",
    "pdf-to-word",
    "word-to-pdf",
    "photo-compressor",
    "signature-resizer"
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

  const pane = (id, title, kicker, tools, active) => [
    '<section class="tool-pane' + (active ? ' is-active' : '') + '" id="pane-' + id + '" role="tabpanel" aria-labelledby="tab-' + id + '" data-tool-pane="' + id + '"' + (active ? '' : ' hidden') + '>',
    '<div class="tool-pane-heading"><div><div class="tool-category-kicker">' + kicker + '</div><h3>' + title + '</h3></div><span>' + tools.length + ' tools</span></div>',
    '<div class="tool-card-grid">',
    cardsFor(tools),
    '</div>',
    '</section>'
  ].join("\n");

  const popularTools = popularIds.map((id) => toolRegistry.find((tool) => tool.id === id)).filter(Boolean);
  const panes = [
    pane("popular", "Popular tools", "Start here", popularTools, true),
    ...categoryGroups.map((group) => {
      const tools = group.ids.map((id) => toolRegistry.find((tool) => tool.id === id)).filter(Boolean);
      return pane(group.id, group.title, group.kicker, tools, false);
    })
  ].join("\n");




  html = html.slice(0, startIndex + start.length) + "\n" + panes + "\n" + html.slice(endIndex);

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
