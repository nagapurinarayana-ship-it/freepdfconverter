import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const htmlFiles = await collectHtml(dist);

const POPUNDER = '<script src="https://pl30806638.effectivecpmnetwork.com/64/d8/80/64d880a1349413fe7dcb55cf8a8b6379.js"></script>';
const NATIVE = '<script async="async" data-cfasync="false" src="https://pl30806640.effectivecpmnetwork.com/d0874cab14ed56771eb0d709062b71da/invoke.js"></script><div id="container-d0874cab14ed56771eb0d709062b71da"></div>';
const SOCIAL = '<script src="https://pl30806641.effectivecpmnetwork.com/a8/89/7e/a8897ecee48386eabd13ef3cbb2661c5.js"></script>';
const SMARTLINK = '<div class="ad-smartlink"><span class="ad-label">Sponsored</span><a href="https://www.effectivecpmnetwork.com/c1kt57md?key=16cfe2b361699a8b0b12a8dc0c8c79b7" target="_blank" rel="sponsored noopener noreferrer">Explore sponsored offers</a></div>';

for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");

  // Remove any previous generated EffectiveCPM markup so repeated builds stay idempotent.
  html = removeManagedBlocks(html);

  // Publisher placement: popunder immediately before </head>.
  html = html.replace("</head>", POPUNDER + "\n</head>");

  // Native banner: place the exact network snippet after the content ad anchor,
  // keeping the network script immediately before its required container.
  const contentAnchor = '<div class="container"><div class="ad-container" data-ad-zone="content" aria-label="Advertisement"></div></div>';
  if (html.includes(contentAnchor)) {
    const nativeBlock = '<div class="container"><div class="ad-container ad-native-container" aria-label="Sponsored advertisement">' + NATIVE + SMARTLINK + '</div></div>';
    html = html.replace(contentAnchor, contentAnchor + "\n" + nativeBlock);
  }

  // Publisher placement: social bar immediately before </body>.
  html = html.replace("</body>", SOCIAL + "\n</body>");

  await writeFile(file, html, "utf8");
}

console.log(`Injected EffectiveCPM placements into ${htmlFiles.length} generated HTML pages.`);

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
  const nativeBlock = /\n?\s*<div class="container"><div class="ad-container ad-native-container" aria-label="Sponsored advertisement">\s*<script async="async" data-cfasync="false" src="https:\/\/pl30806640\.effectivecpmnetwork\.com\/d0874cab14ed56771eb0d709062b71da\/invoke\.js"><\/script><div id="container-d0874cab14ed56771eb0d709062b71da"><\/div>\s*<div class="ad-smartlink"><span class="ad-label">Sponsored<\/span><a href="https:\/\/www\.effectivecpmnetwork\.com\/c1kt57md\?key=16cfe2b361699a8b0b12a8dc0c8c79b7"[^>]*>Explore sponsored offers<\/a><\/div>\s*<\/div><\/div>/g;
  return html
    .replace(nativeBlock, "")
    .replace(/\n?\s*<script src="https:\/\/pl30806638\.effectivecpmnetwork\.com\/64\/d8\/80\/64d880a1349413fe7dcb55cf8a8b6379\.js"><\/script>\n?/g, "\n")
    .replace(/\n?\s*<script src="https:\/\/pl30806641\.effectivecpmnetwork\.com\/a8\/89\/7e\/a8897ecee48386eabd13ef3cbb2661c5\.js"><\/script>\n?/g, "\n");
}
