import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const htmlFiles = [];
await collectHtml(dist);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const normalized = html.replace(/(href=["'])([^"']+)(["'])/gi, function (full, prefix, href, suffix) {
    if (/^(?:https?:|mailto:|tel:|data:|#|javascript:)/i.test(href)) return full;

    const suffixIndex = href.search(/[?#]/);
    const pathPart = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
    const trailing = suffixIndex === -1 ? "" : href.slice(suffixIndex);

    if (!/\.html$/i.test(pathPart)) return full;

    let clean = pathPart.slice(0, -5);
    if (clean === "index") clean = "./";
    else if (clean.endsWith("/index")) clean = clean.slice(0, -5) || "./";

    return prefix + clean + trailing + suffix;
  });

  if (normalized !== html) await writeFile(file, normalized, "utf8");
}

console.log("Normalized internal HTML links in the production build.");

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) htmlFiles.push(full);
  }
}
