import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const INDEX = path.join(dist, "index.html");

// Keep the EffectiveCPM implementation aligned with CraftMyPage.
const POPUNDER = '<script src="https://pl30815332.effectivecpmnetwork.com/98/cd/4d/98cd4d37b3a5c234c49c85952c033714.js"></script>';
const SOCIAL_BAR = '<script src="https://pl30815335.effectivecpmnetwork.com/e7/87/aa/e787aa4e8d5075169853c0d1fe5fcabc.js"></script>';
const NATIVE_SRC = "https://pl30815334.effectivecpmnetwork.com/29feded00f4ae2c8a3b2719189977fff/invoke.js";
const NATIVE_CONTAINER_ID = "container-29feded00f4ae2c8a3b2719189977fff";
const BANNER_468_SRC = "https://www.highperformanceformat.com/75b0fc4d7ef9bda7dbda8e3863498abc/invoke.js";
const BANNER_728_SRC = "https://www.highperformanceformat.com/b5828b9099d859c0a506e4067dd77370/invoke.js";
const BANNER_468_KEY = "75b0fc4d7ef9bda7dbda8e3863498abc";
const BANNER_728_KEY = "b5828b9099d859c0a506e4067dd77370";
const SMARTLINK = "https://www.effectivecpmnetwork.com/hcit0ft2?key=3383ae2b2a94f70103f6b28c372f4f72";

const MARKER_START = "<!-- freepdf-effectivecpm:start -->";
const MARKER_END = "<!-- freepdf-effectivecpm:end -->";

let html = await readFile(INDEX, "utf8");
html = stripExisting(html);

// Same global scripts as CraftMyPage: popunder in <head>, social bar before </body>.
html = html.replace("</head>", POPUNDER + "\n</head>");

// Equivalent of CraftMyPage's EffectiveCpmHomeAds component, expressed as
// static HTML so it fits FreePDF's existing static build without changing
// any SEO/meta markup or page content.
const anchor = '<div class="container"><div class="ad-container" data-ad-zone="top" aria-label="Advertisement"></div></div>';
const homeAds = `
${MARKER_START}
<section class="section" aria-label="Advertisements">
  <div class="container">
    <div class="ad-container ad-native-container" aria-label="Sponsored advertisement">
      <div class="ad-label">Advertisement</div>
      <div id="${NATIVE_CONTAINER_ID}"></div>
      <script async data-cfasync="false" src="${NATIVE_SRC}"></script>
    </div>

    <div class="ad-container" aria-label="Sponsored advertisement">
      <div class="ad-label">Advertisement · 468×60</div>
      <div class="ad-banner-468" style="max-width:100%;overflow:hidden;text-align:center">
        <script>
          atOptions = {
            key: '${BANNER_468_KEY}',
            format: 'iframe',
            height: 60,
            width: 468,
            params: {}
          };
        </script>
        <script src="${BANNER_468_SRC}"></script>
      </div>
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

if (html.includes(anchor)) {
  // Replace the existing top placeholder with the same four placement types
  // used by CraftMyPage rather than leaving an extra inactive ad slot behind.
  html = html.replace(anchor, homeAds);
}

html = html.replace("</body>", SOCIAL_BAR + "\n</body>");
await writeFile(INDEX, html, "utf8");

console.log("EffectiveCPM monetization injected into FreePDF homepage using the CraftMyPage implementation.");

function stripExisting(source) {
  const escapedStart = MARKER_START.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  const escapedEnd = MARKER_END.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  const managed = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, "g");

  return source
    .replace(managed, "")
    .replace(/\n?\s*<script src="https:\/\/pl30815332\.effectivecpmnetwork\.com\/98\/cd\/4d\/98cd4d37b3a5c234c49c85952c033714\.js"><\/script>\n?/g, "\n")
    .replace(/\n?\s*<script src="https:\/\/pl30815335\.effectivecpmnetwork\.com\/e7\/87\/aa\/e787aa4e8d5075169853c0d1fe5fcabc\.js"><\/script>\n?/g, "\n");
}
