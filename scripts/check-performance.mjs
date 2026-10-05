import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const failures = [];
const htmlFiles = [];
const jsFiles = [];

await collect(dist);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");

  // One managed Adsterra placement hook per generated page.
  const markerCount = (html.match(/freepdf-effectivecpm:(?:start|end)/g) || []).length;
  if (markerCount !== 2) failures.push(relative + " -> expected exactly one managed Adsterra placement block");

  const h1Pos = html.search(/<h1\b/i);
  const adsPos = html.indexOf("<!-- freepdf-effectivecpm:start -->");
  if (h1Pos !== -1 && adsPos !== -1 && adsPos < h1Pos) {
    failures.push(relative + " -> managed advertisement block appears before primary H1");
  }

  // Ads must never become the first visible content shell.
  const mainPos = html.search(/<main\b/i);
  if (mainPos !== -1 && adsPos !== -1 && adsPos < mainPos) {
    failures.push(relative + " -> managed advertisement block appears before main content");
  }

  // Legacy ad/provider identifiers must not be embedded into generated HTML.
  if (/pl3080663[468]|effectivecpmnetwork|highperformanceformat|highrevenueformat|profitableratecpmnetwork/i.test(html)) {
    failures.push(relative + " -> third-party ad code leaked into page HTML; use the runtime monetization layer");
  }
}

// Verify the supplied Adsterra units remain configured in the runtime layer.
// We intentionally validate configuration rather than hard-code third-party URLs
// into every HTML page, which keeps the initial document leaner and easier to cache.
const jsSources = [];
for (const file of jsFiles) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  const source = await readFile(file, "utf8");
  jsSources.push({ relative, source });
}

const monetizationSource = jsSources.map(item => item.source).join("\n");
if (!/FreePDFMonetization|bannerKey|smartlinkUrl/.test(monetizationSource)) {
  failures.push("monetization -> runtime Adsterra configuration is missing");
}
for (const [label, needle] of [
  ["Native Banner", "d0874cab14ed56771eb0d709062b71da"],
  ["Social Bar", "a8897ecee48386eabd13ef3cbb2661c5"],
  ["Popunder", "64d880a1349413fe7dcb55cf8a8b6379"],
  ["Smartlink", "c1kt57md?key=16cfe2b361699a8b0b12a8dc0c8c79b7"],
  ["728x90 Banner", "7b9ff27e517a15cbdb8b889b758ec1b"],
  ["Banner source", "highrevenueformat.com"]
]) {
  if (!monetizationSource.includes(needle)) failures.push("monetization -> supplied Adsterra " + label + " configuration is missing");
}

for (const [label, needle] of [
  ["Native Banner domain", "profitableratecpmnetwork.com"],
  ["Social Bar domain", "profitableratecpmnetwork.com"],
  ["Popunder domain", "profitableratecpmnetwork.com"],
  ["Smartlink domain", "profitableratecpmnetwork.com"],
  ["728x90 Banner domain", "highrevenueformat.com"]
]) {
  if (!monetizationSource.includes(needle)) failures.push("monetization -> expected Adsterra " + label + " source is missing");
}

if (failures.length) {
  console.error("Performance/monetization checks failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Performance and monetization placement checks passed for " + htmlFiles.length + " HTML pages.");

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(full);
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase().endsWith(".html") && entry.name !== "google0982473b0f1ce198.html") htmlFiles.push(full);
      if (/\.js$/i.test(entry.name)) jsFiles.push(full);
    }
  }
}
