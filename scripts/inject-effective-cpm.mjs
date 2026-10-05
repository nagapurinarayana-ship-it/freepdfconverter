import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const MARKER_START = "<!-- freepdf-effectivecpm:start -->";
const MARKER_END = "<!-- freepdf-effectivecpm:end -->";
const htmlFiles = [];
await collectHtml(dist);

// Adsterra is mounted by assets/js/ads.js at runtime. This build step deliberately
// creates only stable, empty placement hooks so third-party scripts never become
// part of the build HTML and never block/replace page content.
for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  html = stripLegacyAdMarkup(html);

  const hasManagedZone = /data-ad-zone=["'](?:content|mid)["']/i.test(html);
  if (!hasManagedZone && html.includes("</main>")) {
    const pageAds = `\n${MARKER_START}\n<div class="container"><div class="ad-container ad-container-managed" data-ad-zone="content" aria-label="Advertisement"></div></div>\n${MARKER_END}`;
    const toolHero = html.match(/<section[^>]*class=["'][^"']*tool-hero[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
    if (toolHero && toolHero.index !== undefined) {
      const insertAt = toolHero.index + toolHero[0].length;
      html = html.slice(0, insertAt) + pageAds + html.slice(insertAt);
    } else {
      const article = html.match(/<article\b[\s\S]*?<\/article>/i);
      if (article && article.index !== undefined) {
        const insertAt = article.index + article[0].length;
        html = html.slice(0, insertAt) + pageAds + html.slice(insertAt);
      } else {
        const mainEnd = html.lastIndexOf("</main>");
        html = html.slice(0, mainEnd) + pageAds + html.slice(mainEnd);
      }
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
