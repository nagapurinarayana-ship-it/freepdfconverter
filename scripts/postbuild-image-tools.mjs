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

// The entry bootstrap is the only module that should initialize the new image
// tools. Loading the tool module directly as a second module is unsafe because
// the tool modules read shared window.FreePDF state during module evaluation,
// while common.js is a deferred classic script. On some browsers this ordering
// race leaves the module evaluated before window.FreePDF exists and the entry
// import then reuses the failed module evaluation. Remove any eager tool-module
// tags from the generated HTML; the stable entry loads the tool after
// DOMContentLoaded, when the shared runtime is guaranteed to be initialized.
const eagerToolModule = /\s*<script\s+type=["']module["']\s+src=["'][^"']*assets\/js\/tools\/[^"']+\.tool\.js["']><\/script>/gi;
let removedEagerToolModules = 0;
const walkHtml = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkHtml(full);
    else if (entry.name.endsWith(".html")) {
      const content = await readFile(full, "utf8");
      const matches = content.match(eagerToolModule);
      if (matches?.length) removedEagerToolModules += matches.length;
      const cleaned = content.replace(eagerToolModule, "");
      if (cleaned !== content) await writeFile(full, cleaned, "utf8");
    }
  }
};
await walkHtml(dist);

console.log(`Added application-upload workflow cross-links and normalized ${entryMappings.length} image-tool entry scripts; removed ${removedEagerToolModules} eager image-tool module tags`);
