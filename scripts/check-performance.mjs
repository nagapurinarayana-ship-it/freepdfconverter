import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const failures = [];
const htmlFiles = [];

await collectHtml(dist);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");

  // Guard the monetization integration: exactly one managed block and one provider
  // placement of each type per generated page. This prevents accidental ad duplication.
  const markerCount = (html.match(/freepdf-effectivecpm:(?:start|end)/g) || []).length;
  if (markerCount !== 2) failures.push(`${relative} -> expected one managed EffectiveCPM block`);
  if ((html.match(/pl30806638\.effectivecpmnetwork\.com/g) || []).length !== 1) failures.push(`${relative} -> unexpected Popunder count`);
  if ((html.match(/pl30806640\.effectivecpmnetwork\.com/g) || []).length !== 1) failures.push(`${relative} -> unexpected Native count`);
  if ((html.match(/7b9ff27e517a15dcbdb8b889b758ec1b/g) || []).length !== 2) failures.push(`${relative} -> unexpected 728x90 key count`);
  if ((html.match(/c1kt57md\?key=16cfe2b361699a8b0b12a8dc0c8c79b7/g) || []).length !== 1) failures.push(`${relative} -> unexpected Smartlink count`);
  if ((html.match(/pl30806641\.effectivecpmnetwork\.com/g) || []).length !== 1) failures.push(`${relative} -> unexpected Social Bar count`);

  // The primary content must precede the managed ad block so ads do not become the
  // first meaningful page section. Provider-required Popunder/Social Bar locations
  // remain checked separately by the exact script order.
  const mainPos = html.search(/<main\b/i);
  const adsPos = html.indexOf("<!-- freepdf-effectivecpm:start -->");
  if (mainPos !== -1 && adsPos !== -1 && adsPos < mainPos) failures.push(`${relative} -> ad block appears before main content`);

  const headPopunder = html.indexOf("pl30806638.effectivecpmnetwork.com");
  const headEnd = html.indexOf("</head>");
  if (headPopunder === -1 || headEnd === -1 || headPopunder > headEnd) failures.push(`${relative} -> Popunder is not in head`);

  const social = html.indexOf("pl30806641.effectivecpmnetwork.com");
  const bodyEnd = html.lastIndexOf("</body>");
  if (social === -1 || bodyEnd === -1 || social > bodyEnd) failures.push(`${relative} -> Social Bar is not before body close`);

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
