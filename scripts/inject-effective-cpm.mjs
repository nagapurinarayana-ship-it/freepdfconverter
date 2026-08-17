import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// FreePDFConverter's own Adsterra / EffectiveCPM ad units only.
const NATIVE_SRC = "https://pl30806640.effectivecpmnetwork.com/d0874cab14ed56771eb0d709062b71da/invoke.js";
const NATIVE_CONTAINER_ID = "container-d0874cab14ed56771eb0d709062b71da";
const BANNER_728_SRC = "https://www.highperformanceformat.com/7b9ff27e517a15dcbdb8b889b758ec1b/invoke.js";
const BANNER_728_KEY = "7b9ff27e517a15dcbdb8b889b758ec1b";
const SMARTLINK = "https://www.effectivecpmnetwork.com/c1kt57md?key=16cfe2b361699a8b0b12a8dc0c8c79b7";

const MARKER_START = "<!-- freepdf-effectivecpm:start -->";
const MARKER_END = "<!-- freepdf-effectivecpm:end -->";

const htmlFiles = [];
await collectHtml(dist);

for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  html = stripExisting(html);


  const pageAds = `
${MARKER_START}
<section class="section freepdf-ad-section" aria-label="Advertisements">
  <div class="container">
    <div class="ad-container ad-native-container" aria-label="Sponsored advertisement">
      <div class="ad-label">Advertisement</div>
      <div id="${NATIVE_CONTAINER_ID}"></div>
      <script async data-cfasync="false" src="${NATIVE_SRC}"></script>
    </div>

    <div class="ad-container ad-banner-728-container" aria-label="Sponsored advertisement">
      <div class="ad-label">Advertisement · 728×90</div>
      <div class="ad-banner-728" style="max-width:100%;overflow:hidden;text-align:center">
        <script>
          atOptions = {
            key: '${BANNER_728_KEY}',
            format: 'iframe',
            height: 90,
            width: 728,
            params: {}
          };
        </script>
        <script src="${BANNER_728_SRC}"></script>
      </div>
    </div>

    <div class="ad-container ad-smartlink-container" aria-label="Sponsored offers">
      <span class="ad-label">Sponsored</span>
      <a href="${SMARTLINK}" target="_blank" rel="sponsored noopener noreferrer">Explore sponsored offers →</a>
    </div>
  </div>
</section>
${MARKER_END}`;

  // Keep the primary page content first. This reduces the chance that the ad block
  // becomes the initial LCP and gives the tool/hero a stable position before ads load.
  // On tool pages insert after .tool-hero; on the homepage/other pages insert after
  // the first top-level section inside <main>. Existing page content is untouched.
  if (html.includes("</main>")) {
    const toolHeroEnd = html.indexOf("</section>", html.indexOf("<section class=\"tool-hero\""));
    if (toolHeroEnd !== -1) {
      const insertAt = toolHeroEnd + "</section>".length;
      html = html.slice(0, insertAt) + pageAds + html.slice(insertAt);
    } else {
      const mainOpenEnd = html.indexOf(">", html.search(/<main\b/i));
      if (mainOpenEnd !== -1) {
        const mainStart = mainOpenEnd + 1;
        const sectionMatch = html.slice(mainStart).match(/<section\b/i);
        if (sectionMatch) {
          const sectionStart = mainStart + sectionMatch.index;
          const sectionEnd = html.indexOf("</section>", sectionStart);
          if (sectionEnd !== -1) {
            const insertAt = sectionEnd + "</section>".length;
            html = html.slice(0, insertAt) + pageAds + html.slice(insertAt);
          } else {
            html = html.slice(0, mainStart) + pageAds + html.slice(mainStart);
          }
        } else {
          html = html.slice(0, mainStart) + pageAds + html.slice(mainStart);
        }
      }
    }
  } else if (html.includes("<body")) {
    const bodyOpenEnd = html.indexOf(">", html.search(/<body\b/i));
    if (bodyOpenEnd !== -1) {
      const bodyStart = bodyOpenEnd + 1;
      html = html.slice(0, bodyStart) + pageAds + html.slice(bodyStart);
    }
  }

  await writeFile(file, html, "utf8");
}

console.log(`FreePDF safe Adsterra Native, Banner and sponsored-link monetization injected into ${htmlFiles.length} HTML pages.`);

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) htmlFiles.push(full);
  }
}

function stripExisting(source) {
  const escapedStart = MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const managed = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, "g");

  return source
    .replace(managed, "")
    .replace(/\n?\s*<script src="https:\/\/pl30806638\.effectivecpmnetwork\.com\/64\/d8\/80\/64d880a1349413fe7dcb55cf8a8b6379\.js"><\/script>\n?/g, "\n")
    .replace(/\n?\s*<script src="https:\/\/pl30806641\.effectivecpmnetwork\.com\/a8\/89\/7e\/a8897ecee48386eabd13ef3cbb2661c5\.js"><\/script>\n?/g, "\n");
}
