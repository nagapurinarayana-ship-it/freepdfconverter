import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const htmlFiles = await collectHtml(dist);

// SEO/UX policy: do not inject popunders, smartlinks, social redirect scripts,
// or forced-navigation advertising. AdSense remains the primary monetization
// layer and existing ad containers remain available to it.
for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  html = removeManagedBlocks(html);
  await writeFile(file, html, "utf8");
}

console.log(`Removed intrusive EffectiveCPM placements from ${htmlFiles.length} generated HTML pages.`);

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function removeManagedBlocks(html) {
  const nativeBlock = /\n?\s*<div class="container"><div class="ad-container ad-native-container" aria-label="Sponsored advertisement">[\s\S]*?<\/div><\/div>/g;
  return html
    .replace(nativeBlock, "")
    .replace(/\n?\s*<script src="https:\/\/pl30806638\.effectivecpmnetwork\.com\/64\/d8\/80\/64d880a1349413fe7dcb55cf8a8b6379\.js"><\/script>\n?/gi, "\n")
    .replace(/\n?\s*<script src="https:\/\/pl30806641\.effectivecpmnetwork\.com\/a8\/89\/7e\/a8897ecee48386eabd13ef3cbb2661c5\.js"><\/script>\n?/gi, "\n");
}
