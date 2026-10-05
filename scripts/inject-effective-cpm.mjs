import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const MARKER_START = "<!-- freepdf-effectivecpm:start -->";
const MARKER_END = "<!-- freepdf-effectivecpm:end -->";
const htmlFiles = [];
await collectHtml(dist);

// Runtime monetization lives in assets/js/ads.js. This build step owns only the
// stable placement contract: one managed placement after the page's primary H1.
for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  html = stripLegacyAdMarkup(html);

  const zonePattern = /<div class="container">\s*<div class="ad-container[^>]*data-ad-zone=["'][^"']+["'][^>]*><\/div>\s*<\/div>/gi;

  // Remove stale placements that were generated above the primary H1. Recalculate
  // the H1 after removal because deleting markup shifts string offsets.
  let h1Match = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
  if (!h1Match || h1Match.index === undefined) {
    await writeFile(file, html, "utf8");
    continue;
  }

  const originalH1End = h1Match.index + h1Match[0].length;
  const zonesToRemove = [];
  for (const match of html.matchAll(zonePattern)) {
    if (match.index < originalH1End) zonesToRemove.push({ start: match.index, end: match.index + match[0].length });
  }
  for (let i = zonesToRemove.length - 1; i >= 0; i -= 1) {
    const zone = zonesToRemove[i];
    html = html.slice(0, zone.start) + html.slice(zone.end);
  }

  // Recalculate the H1 after all pre-H1 zones are removed so any fallback
  // insertion is guaranteed to occur after the actual primary H1.
  h1Match = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
  if (!h1Match || h1Match.index === undefined) {
    await writeFile(file, html, "utf8");
    continue;
  }
  const h1End = h1Match.index + h1Match[0].length;

  if (!html.includes(MARKER_START)) {
    const zoneAfterH1 = html.match(zonePattern);
    if (zoneAfterH1 && zoneAfterH1.index !== undefined && zoneAfterH1.index >= h1End) {
      const zoneStart = zoneAfterH1.index;
      const zoneEnd = zoneStart + zoneAfterH1[0].length;
      html = html.slice(0, zoneStart) + MARKER_START + "\n" + zoneAfterH1[0] + "\n" + MARKER_END + html.slice(zoneEnd);
    } else {
      const pageAds = "\n" + MARKER_START + "\n<div class=\"container\"><div class=\"ad-container ad-container-managed\" data-ad-zone=\"content\" aria-label=\"Advertisement\"></div></div>\n" + MARKER_END;
      html = html.slice(0, h1End) + pageAds + html.slice(h1End);
    }
  }

  await writeFile(file, html, "utf8");
}

console.log(`Prepared ${htmlFiles.length} HTML pages with stable Adsterra placement hooks.`);

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) htmlFiles.push(full);
  }
}

function stripLegacyAdMarkup(source) {
  const escapedStart = MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const managed = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, "g");
  return source
    .replace(managed, "")
    .replace(/\n?\s*<script[^>]+(?:effectivecpmnetwork|highperformanceformat|highrevenueformat|profitableratecpmnetwork)[^>]*><\/script>\n?/gi, "\n");
}
