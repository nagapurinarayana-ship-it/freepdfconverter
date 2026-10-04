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

// V2 loading contract:
// 1. Never rename a fingerprinted image-tool asset to a stable URL.
// 2. HTML points to the fingerprinted entry bootstrap.
// 3. The entry bootstrap dynamically imports the fingerprinted tool module.
// 4. No HTML page may execute the tool module directly.
// 5. Build fails if any of those invariants are broken.
//
// This intentionally does not depend on the previous stable-entry/service-worker
// workaround. Every deployment gets a new immutable URL for both layers.
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
    const directModule = new RegExp('<script\\s+type=["\\']module["\\']\\s+src=["\\'][^"\\']*/' + tool.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + '\\.tool(?:\\.[a-f0-9]{10})?\\.js["\\']><\\/script>', "gi");
    const matches = html.match(directModule);
    if (matches?.length) {
      removedDirectModules += matches.length;
      html = html.replace(directModule, "");
    }

    const entryPattern = new RegExp('<script\\s+(?:type=["\\']module["\\']\\s+)?src=["\\']([^"\\']*/' + tool.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + '\\.entry\\.[a-f0-9]{10}\\.js)["\\'](?:\\s+defer)?\\s*><\\/script>', "gi");
    const entryMatches = [...html.matchAll(entryPattern)];
    if (entryMatches.length > 1) failures.push(`${relative(file)} contains multiple ${tool} fingerprinted entry scripts`);
    if (entryMatches.length === 1) {
      const src = entryMatches[0][1];
      html = html.replace(entryPattern, '<script src="' + src + '" defer></script>');
      normalizedEntries += 1;
    }
  }

  await writeFile(file, html, "utf8");
}

for (const tool of imageTools) {
  const entrySuffix = `/assets/js/tools/${tool}.entry.`;
  const moduleSuffix = `/assets/js/tools/${tool}.tool.`;
  const entries = [...assetNames].filter((name) => name.startsWith(entrySuffix) && name.endsWith(".js"));
  const modules = [...assetNames].filter((name) => name.startsWith(moduleSuffix) && name.endsWith(".js"));

  if (entries.length !== 1) failures.push(`${tool}: expected exactly one fingerprinted entry asset, found ${entries.length}`);
  if (modules.length !== 1) failures.push(`${tool}: expected exactly one fingerprinted tool asset, found ${modules.length}`);

  const stableEntry = `/assets/js/tools/${tool}.entry.js`;
  const stableModule = `/assets/js/tools/${tool}.tool.js`;
  if (assetNames.has(stableEntry)) failures.push(`${tool}: stable entry asset still exists at ${stableEntry}`);
  if (assetNames.has(stableModule)) failures.push(`${tool}: stable tool asset still exists at ${stableModule}`);

  if (entries.length === 1) {
    const entryPath = path.join(dist, entries[0].slice(1));
    const entry = await readFile(entryPath, "utf8");
    const imported = entry.match(/import\\(["']([^"']+)["']\\)/)?.[1] || "";
    if (!imported.includes(`${tool}.tool.`) || !/\\.tool\\.[a-f0-9]{10}\\.js$/.test(imported)) {
      failures.push(`${tool}: fingerprinted entry does not import a fingerprinted tool module (got ${imported || "no dynamic import"})`);
    }
  }

  const escaped = tool.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
  const htmlReference = new RegExp(`/assets/js/tools/${escaped}\\.entry\\.[a-f0-9]{10}\\.js`);
  const referenced = htmlFiles.some(async () => false);
  void referenced;
  const htmlText = await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")));
  if (!htmlText.some((text) => htmlReference.test(text))) failures.push(`${tool}: no HTML page references the fingerprinted entry`);
}

if (failures.length) {
  throw new Error("Image-tool v2 build contract failed:\n- " + failures.join("\n- "));
}

console.log(`Image-tool v2 loading verified: ${normalizedEntries} fingerprinted entry tags, ${removedDirectModules} direct tool modules removed. No stable image-tool URLs are emitted.`);
