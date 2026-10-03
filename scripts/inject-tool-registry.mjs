import { readFile, writeFile } from "node:fs/promises";
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

  const cards = toolRegistry
    .filter((tool) => tool.home !== false)
    .map((tool) => {
      const href = tool.path.replace(/\.html$/i, "");
      return [
        '<a class="tool-card" href="' + href + '">',
        '<span class="tool-icon">' + escapeHtml(tool.icon) + "</span>",
        "<h3>" + escapeHtml(tool.label) + "</h3>",
        "<p>" + escapeHtml(tool.description) + "</p>",
        '<span class="go">Open tool →</span>',
        "</a>"
      ].join("");
    })
    .join("\n");

  html = html.slice(0, startIndex + start.length) + "\n" + cards + "\n" + html.slice(endIndex);

  html = html.replace(
    /<span class="badge" data-tool-count>.*?<\/span>/,
    '<span class="badge" data-tool-count>' + toolRegistry.length + " free tools</span>"
  );

  await writeFile(targetFile, html, "utf8");
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
