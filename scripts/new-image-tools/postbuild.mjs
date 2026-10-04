import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// ONLY new image tools. Existing working tools are intentionally excluded.
const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

const fingerprint = "[a-f0-9]{10}";
let verifiedEntryScripts = 0;
let removedDirectModules = 0;

for (const tool of NEW_IMAGE_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");

  const directModule = new RegExp(
    `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
    "gi"
  );

  const directMatches = html.match(directModule);
  if (directMatches?.length) {
    removedDirectModules += directMatches.length;
    html = html.replace(directModule, "");
  }

  const entryPattern = new RegExp(
    `<script\\s+(?:type=["']module["']\\s+)?src=["']([^"']*/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js)["'](?:\\s+defer)?\\s*></script>`,
    "gi"
  );

  const entryMatches = [...html.matchAll(entryPattern)];

  if (entryMatches.length !== 1) {
    throw new Error(
      `${tool.name}: expected exactly one fingerprinted entry module script in ${tool.page}, found ${entryMatches.length}`
    );
  }

  if (tool.name === "thumb-impression-resizer") {
    const entrySrc = entryMatches[0][1];
    const entryRelative = entrySrc.replace(/^\\//, "");
    const entryFile = path.join(dist, entryRelative);
    const entrySource = await readFile(entryFile, "utf8");
    const moduleImport = entrySource.match(/import\\(["']([^"']+)[\"']\\)/)?.[1] || "";
    if (!/thumb-impression-resizer\\.tool\\.[a-f0-9]{10}\\.js$/.test(moduleImport)) {
      throw new Error(`thumb-impression-resizer: fingerprinted entry does not import the fingerprinted tool module (got ${moduleImport || "none"})`);
    }

    const stableEntryRelative = "assets/js/tools/thumb-impression-resizer.entry.js";
    const stableEntryFile = path.join(dist, stableEntryRelative);
    const stableEntrySource = entrySource.replace(moduleImport, moduleImport);
    await writeFile(stableEntryFile, stableEntrySource, "utf8");
    await rename(entryFile, path.join(dist, "assets/js/tools/thumb-impression-resizer.entry.fingerprint.backup.js"));

    const oldPublicPath = `/assets/js/tools/thumb-impression-resizer.entry.${entryRelative.match(/\\.entry\\.([a-f0-9]{10})\\.js$/)?.[1]}.js`;
    html = html.replace(entryPattern, '<script type="module" src="../assets/js/tools/thumb-impression-resizer.entry.js"></script>');
    html = html.replace(oldPublicPath, "/assets/js/tools/thumb-impression-resizer.entry.js");

    const serviceWorkerPath = path.join(dist, "service-worker.js");
    let serviceWorker = await readFile(serviceWorkerPath, "utf8");
    serviceWorker = serviceWorker.split(entryRelative).join(stableEntryRelative);
    await writeFile(serviceWorkerPath, serviceWorker, "utf8");
    normalizedEntryScripts += 1;
  } else {
    normalizedEntryScripts += 1;
  }

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`) ||
      (tool.name !== "thumb-impression-resizer" && html.includes(`/assets/js/tools/${tool.name}.entry.js`))) {
    throw new Error(`${tool.name}: stable image-tool URL leaked into generated HTML`);
  }

  if (tool.name === "thumb-impression-resizer" && !html.includes("assets/js/tools/thumb-impression-resizer.entry.js")) {
    throw new Error("thumb-impression-resizer: stable entry bootstrap is missing");
  }

  await writeFile(pagePath, html, "utf8");
}

console.log(
  `New image-tools isolated loader: verified ${verifiedEntryScripts} fingerprinted entry modules; removed ${removedDirectModules} direct tool-module scripts. Existing working tools were not modified.`
);
