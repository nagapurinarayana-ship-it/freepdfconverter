import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const marker = String(
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.FREEPDF_BUILD_SHA ||
  process.env.GITHUB_SHA ||
  "local"
).trim();

if (!marker) process.exit(0);

const files = [];
await collect(dist);

for (const file of files) {
  let html = await readFile(file, "utf8");
  html = html.replace(/\s*<meta\s+name=["']freepdf-build-sha["'][^>]*>/gi, "");
  html = html.replace(
    /<\/head>/i,
    `<meta name="freepdf-build-sha" content="${escapeAttr(marker)}">\n</head>`
  );
  await writeFile(file, html, "utf8");
}

console.log(`Injected FreePDF build marker: ${marker}`);

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(full);
  }
}

function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
