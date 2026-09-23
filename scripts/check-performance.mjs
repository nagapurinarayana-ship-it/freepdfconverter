import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const failures = [];
const htmlFiles = [];

await collectHtml(dist);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");

  // Guard the current banner-only EffectiveCPM integration. Every generated
  // page gets exactly one managed block and exactly one 728x90 banner iframe.
  const markerCount = (html.match(/freepdf-effectivecpm:(?:start|end)/g) || []).length;
  if (markerCount !== 2) failures.push(`${relative} -> expected one managed EffectiveCPM block`);
  if ((html.match(/7b9ff27e517a15dcbdb8b889b758ec1b/g) || []).length !== 2) {
    failures.push(`${relative} -> unexpected 728x90 banner key count`);
  }

  // The primary content must precede the managed ad block.
  const mainPos = html.search(/<main\b/i);
  const adsPos = html.indexOf("<!-- freepdf-effectivecpm:start -->");
  if (mainPos !== -1 && adsPos !== -1 && adsPos < mainPos) failures.push(`${relative} -> ad block appears before main content`);

  // Obsolete EffectiveCPM placements must never return.
  if (/pl3080663[468]|c1kt57md\?key=16cfe2b361699a8b0b12a8dc0c8c79b7|craftmypage/i.test(html)) {
    failures.push(`${relative} -> obsolete/foreign monetization identifier detected`);
  }

  // Never allow the CraftMyPage publisher identifiers back into FreePDF.
  if (/pl3080666[34]|craftmypage/i.test(html)) failures.push(`${relative} -> foreign/CraftMyPage monetization identifier detected`);
}

if (failures.length) {
  console.error("Performance/monetization checks failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`Performance and monetization placement checks passed for ${htmlFiles.length} HTML pages.`);

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) htmlFiles.push(full);
  }
}
