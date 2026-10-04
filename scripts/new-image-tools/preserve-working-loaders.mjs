import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const toolsDir = path.join(dist, "assets/js/tools");

// These six are NEW and must never be changed by the legacy compatibility path.
const NEW_TOOLS = new Set([
  "photo-compressor",
  "signature-resizer",
  "passport-id-photo-maker",
  "thumb-impression-resizer",
  "handwritten-declaration-resizer",
  "sign-pdf"
]);

// Every other tool keeps the previous production loader contract.
const files = await readdir(toolsDir);
const entryMappings = [];

for (const file of files) {
  const match = file.match(/^(.+)\.entry\.([a-f0-9]{10})\.js$/);
  if (!match || NEW_TOOLS.has(match[1])) continue;

  const oldPath = `/assets/js/tools/${file}`;
  const stableFile = `${match[1]}.entry.js`;
  const stablePath = `/assets/js/tools/${stableFile}`;
  await rename(path.join(toolsDir, file), path.join(toolsDir, stableFile));
  entryMappings.push([oldPath, stablePath]);
}

if (entryMappings.length) {
  const textFiles = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(?:html|js|json|webmanifest)$/i.test(entry.name) || entry.name === "service-worker.js") textFiles.push(full);
    }
  };
  await walk(dist);

  for (const file of textFiles) {
    let content = await readFile(file, "utf8");
    for (const [oldPath, stablePath] of entryMappings) content = content.split(oldPath).join(stablePath);
    await writeFile(file, content, "utf8");
  }

  const legacyToolNames = entryMappings.map(([_, stablePath]) => path.basename(stablePath).replace(/\.entry\.js$/, ""));
  const htmlFiles = [];
  const walkHtml = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walkHtml(full);
      else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
    }
  };
  await walkHtml(dist);

  for (const file of htmlFiles) {
    let html = await readFile(file, "utf8");
    for (const tool of legacyToolNames) {
      const directModule = new RegExp(`<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool}\\.tool(?:\\.[a-f0-9]{10})?\\.js["']\\s*></script>`, "gi");
      html = html.replace(directModule, "");
      const fingerprintedEntry = new RegExp(`<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool}\\.entry\\.[a-f0-9]{10}\\.js["']\\s*></script>`, "gi");
      html = html.replace(fingerprintedEntry, `<script src="../assets/js/tools/${tool}.entry.js" defer></script>`);
    }
    await writeFile(file, html, "utf8");
  }

  const serviceWorkerPath = path.join(dist, "service-worker.js");
  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  for (const [oldPath, stablePath] of entryMappings) serviceWorker = serviceWorker.split(oldPath).join(stablePath);
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");
}

console.log(`Legacy loader compatibility preserved for existing tools. New tools excluded: ${[...NEW_TOOLS].join(", ")}.`);
