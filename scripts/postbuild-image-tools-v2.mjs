import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const indexPath = path.join(dist, "index.html");

const marker = '<section class="section alt"><div class="container"><div class="section-heading"><span class="eyebrow">Popular utility</span>';
const block = '<section class="section" id="application-upload-workflows"><div class="container"><div class="section-heading"><span class="eyebrow">Application upload workflows</span><h2>Prepare files for strict upload limits</h2><p>Use the image optimizer for photos, signatures and batch image uploads, or use target-size PDF compression when a form limits the document size.</p><p><a class="button" href="tools/photo-compressor">Prepare a photo →</a> <a class="button secondary" href="tools/signature-resizer">Prepare a signature →</a> <a class="button secondary" href="tools/passport-id-photo-maker">Create an ID photo →</a> <a class="button secondary" href="tools/thumb-impression-resizer">Prepare a thumb impression →</a> <a class="button secondary" href="tools/handwritten-declaration-resizer">Prepare a handwritten declaration →</a> <a class="button secondary" href="tools/compress-pdf">Compress a PDF →</a></p></div></div></section>';

let index = await readFile(indexPath, "utf8");
if (!index.includes('id="application-upload-workflows"') && index.includes(marker)) {
  index = index.replace(marker, block + marker);
  await writeFile(indexPath, index, "utf8");
}

// V2 is deliberately independent of the previous stable-entry workaround.
// Every deployment keeps both image-tool layers immutable and fingerprinted:
// HTML -> fingerprinted entry -> fingerprinted tool module.
const imageTools = [
  "photo-compressor",
  "signature-resizer",
  "passport-id-photo-maker",
  "thumb-impression-resizer",
  "handwritten-declaration-resizer"
];

const htmlFiles = [];
const walkHtml = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkHtml(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(full);
  }
};
await walkHtml(dist);

const allFiles = [];
const walkFiles = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkFiles(full);
    else allFiles.push(full);
  }
};
await walkFiles(dist);

const relative = (file) => "/" + path.relative(dist, file).split(path.sep).join("/");
const assetNames = new Set(allFiles.map(relative));
const failures = [];
let removedDirectModules = 0;
let normalizedEntries = 0;

for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");

  for (const tool of imageTools) {
    const directModule = new RegExp(
      `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool}\\.tool(?:\\.[a-f0-9]{10})?\\.js["']\\s*><\\/script>`,
      "gi"
    );
    const directMatches = html.match(directModule);
    if (directMatches?.length) {
      removedDirectModules += directMatches.length;
      html = html.replace(directModule, "");
    }

    const entryPattern = new RegExp(
      `<script\\s+(?:type=["']module["']\\s+)?src=["']([^"']*/${tool}\\.entry\\.[a-f0-9]{10}\\.js)["'](?:\\s+defer)?\\s*><\\/script>`,
      "gi"
    );
    const entryMatches = [...html.matchAll(entryPattern)];
    if (entryMatches.length > 1) failures.push(`${relative(file)} contains multiple ${tool} fingerprinted entry scripts`);
    if (entryMatches.length === 1) {
      const src = entryMatches[0][1];
      html = html.replace(entryPattern, `<script src="${src}" defer></script>`);
      normalizedEntries += 1;
    }
  }

  await writeFile(file, html, "utf8");
}

const htmlText = await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")));

for (const tool of imageTools) {
  const entries = [...assetNames].filter((name) => name.startsWith(`/assets/js/tools/${tool}.entry.`) && name.endsWith(".js"));
  const modules = [...assetNames].filter((name) => name.startsWith(`/assets/js/tools/${tool}.tool.`) && name.endsWith(".js"));

  if (entries.length !== 1) failures.push(`${tool}: expected exactly one fingerprinted entry asset, found ${entries.length}`);
  if (modules.length !== 1) failures.push(`${tool}: expected exactly one fingerprinted tool asset, found ${modules.length}`);

  if (assetNames.has(`/assets/js/tools/${tool}.entry.js`)) failures.push(`${tool}: stable entry asset still exists`);
  if (assetNames.has(`/assets/js/tools/${tool}.tool.js`)) failures.push(`${tool}: stable tool asset still exists`);

  if (entries.length === 1) {
    const entryPath = path.join(dist, entries[0].slice(1));
    const entry = await readFile(entryPath, "utf8");
    const imported = entry.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
    if (!imported.endsWith(".js") || !imported.includes(`${tool}.tool.`) || !/\.tool\.[a-f0-9]{10}\.js$/.test(imported)) {
      failures.push(`${tool}: entry does not dynamically import a fingerprinted tool module (got ${imported || "none"})`);
    }
  }

  const htmlReference = new RegExp(`/assets/js/tools/${tool}\\.entry\\.[a-f0-9]{10}\\.js`);
  if (!htmlText.some((text) => htmlReference.test(text))) failures.push(`${tool}: no HTML page references its fingerprinted entry`);
}

if (failures.length) {
  throw new Error("Image-tool v2 build contract failed:\n- " + failures.join("\n- "));
}

console.log(`Image-tool v2 loading verified: ${normalizedEntries} fingerprinted entry tags, ${removedDirectModules} direct tool modules removed. No stable image-tool URLs are emitted.`);
