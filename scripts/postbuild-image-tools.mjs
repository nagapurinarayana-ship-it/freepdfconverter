import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const indexPath = path.join(dist, "index.html");
let index = await readFile(indexPath, "utf8");

const marker = '<section class="section alt"><div class="container"><div class="section-heading"><span class="eyebrow">Popular utility</span>';
const block = '<section class="section" id="application-upload-workflows"><div class="container"><div class="section-heading"><span class="eyebrow">Application upload workflows</span><h2>Prepare files for strict upload limits</h2><p>Use the image optimizer for photos, signatures and batch image uploads, or use target-size PDF compression when a form limits the document size.</p><p><a class="button" href="tools/photo-compressor">Prepare a photo →</a> <a class="button secondary" href="tools/signature-resizer">Prepare a signature →</a> <a class="button secondary" href="tools/passport-id-photo-maker">Create an ID photo →</a> <a class="button secondary" href="tools/thumb-impression-resizer">Prepare a thumb impression →</a> <a class="button secondary" href="tools/handwritten-declaration-resizer">Prepare a handwritten declaration →</a> <a class="button secondary" href="tools/compress-pdf">Compress a PDF →</a></p></div></div></section>';

if (!index.includes('id="application-upload-workflows"') && index.includes(marker)) {
  index = index.replace(marker, block + marker);
  await writeFile(indexPath, index, "utf8");
}

// Entry scripts are tiny stable bootstrap files. Keep their public URLs stable;
// they dynamically import the fingerprinted tool module produced by the build.
// This also keeps the generated HTML contract deterministic for the image tools.
const toolsDir = path.join(dist, "assets/js/tools");
const files = await readdir(toolsDir);
const entryMappings = [];
for (const file of files) {
  const match = file.match(/^(.+)\.entry\.[a-f0-9]{10}\.js$/);
  if (!match) continue;
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
}

// Load image-tool bootstraps exactly like the proven classic-defer JPG→PDF path:
// common.js runs first, then the stable entry script dynamically imports the
// fingerprinted tool module. Do not let the .tool.js module execute directly
// from HTML, because it reads window.FreePDF during module evaluation.
const eagerToolModule = /\s*<script\s+type=["']module["']\s+src=["'][^"']*assets\/js\/tools\/(?:photo-compressor|signature-resizer|passport-id-photo-maker|thumb-impression-resizer|handwritten-declaration-resizer)\.tool\.js["']><\/script>/gi;
const entryModuleTag = /<script\s+type=["']module["']\s+src=["']([^"']*assets\/js\/tools\/(?:photo-compressor|signature-resizer|passport-id-photo-maker|thumb-impression-resizer|handwritten-declaration-resizer)\.entry\.js)["']><\/script>/gi;
let removedToolModules = 0;
let normalizedEntryTags = 0;

const htmlFiles = [];
const walkHtml = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkHtml(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(full);
  }
};
await walkHtml(dist);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const removed = html.match(eagerToolModule);
  if (removed?.length) removedToolModules += removed.length;
  const withoutEagerModules = html.replace(eagerToolModule, "");
  const normalized = withoutEagerModules.replace(entryModuleTag, function (_full, src) {
    normalizedEntryTags += 1;
    return '<script src="' + src + '" defer></script>';
  });
  if (normalized !== html) await writeFile(file, normalized, "utf8");
}

console.log("Added application-upload workflow cross-links and normalized " + entryMappings.length + " image-tool entry scripts; removed " + removedToolModules + " direct tool modules; normalized " + normalizedEntryTags + " entry tags to classic defer");
