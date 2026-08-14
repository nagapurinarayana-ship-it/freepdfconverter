import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// FreePDFConverter's own Adsterra / EffectiveCPM ad units only.
const POPUNDER = '<script src="https://pl30806638.effectivecpmnetwork.com/64/d8/80/64d880a1349413fe7dcb55cf8a8b6379.js"></script>';
const SOCIAL_BAR = '<script src="https://pl30806641.effectivecpmnetwork.com/a8/89/7e/a8897ecee48386eabd13ef3cbb2661c5.js"></script>';
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

  // FreePDF's own Popunder: one per page, before </head>.
  if (html.includes("</head>")) html = html.replace("</head>", POPUNDER + "\n</head>");

  // FreePDF's own four body placements: Native, 728x90, Smartlink.
  const pageAds = `
${MARKER_START}
<section class="section" aria-label="Advertisements">
  <div class="container">
    <div class="ad-container ad-native-container" aria-label="Sponsored advertisement">
      <div class="ad-label">Advertisement</div>
      <div id="${NATIVE_CONTAINER_ID}"></div>
      <script async data-cfasync="false" src="${NATIVE_SRC}"></script>
    </div>

    <div class="ad-container" aria-label="Sponsored advertisement">
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

    <div class="ad-container" aria-label="Sponsored offers">
      <span class="ad-label">Sponsored</span>
      <a href="${SMARTLINK}" target="_blank" rel="sponsored noopener noreferrer">Explore sponsored offers →</a>
    </div>
  </div>
</section>
${MARKER_END}`;

  // Keep existing SEO/meta/content untouched. Insert managed ads only in the body.
  if (html.includes("<main")) {
    html = html.replace(/(<main\b[^>]*>)/i, `$1${pageAds}`);
  } else if (html.includes("<body")) {
    html = html.replace(/(<body\b[^>]*>)/i, `$1${pageAds}`);
  }

  // FreePDF's own Social Bar: immediately before </body>.
  if (html.includes("</body>")) html = html.replace("</body>", SOCIAL_BAR + "\n</body>");
  await writeFile(file, html, "utf8");
}

console.log(`FreePDF's own EffectiveCPM monetization injected into ${htmlFiles.length} HTML pages.`);

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectHtml(full);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      htmlFiles.push(full);
    }
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
