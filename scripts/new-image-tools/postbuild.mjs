import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// New tools only. Existing working tools are intentionally excluded.
const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" }
];

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

  const entrySrc = entryMatches[0][1];
  const entryFile = path.resolve(path.dirname(pagePath), entrySrc);
  const entryRelative = path.relative(dist, entryFile).split(path.sep).join("/");
  const entrySource = await readFile(entryFile, "utf8");

  const moduleImport = entrySource.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
  const modulePattern = new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`);
  if (!modulePattern.test(moduleImport)) {
    throw new Error(
      `${tool.name}: fingerprinted entry does not import its fingerprinted tool module (got ${moduleImport || "none"})`
    );
  }

  if (tool.name === "thumb-impression-resizer") {
    const stableEntryRelative = "assets/js/tools/thumb-impression-resizer.entry.js";
    const stableEntryFile = path.join(dist, stableEntryRelative);

    await writeFile(stableEntryFile, entrySource, "utf8");
    await rm(entryFile, { force: true });

    const oldPublicPath = "/" + entryRelative;
    html = html.replace(
      entryPattern,
      '<script type="module" src="../assets/js/tools/thumb-impression-resizer.entry.js"></script>'
    );

    const serviceWorkerPath = path.join(dist, "service-worker.js");
    let serviceWorker = await readFile(serviceWorkerPath, "utf8");
    serviceWorker = serviceWorker.split(oldPublicPath).join("/" + stableEntryRelative);
    await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  }

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into generated HTML`);
  }

  if (tool.name === "thumb-impression-resizer") {
    if (!html.includes("assets/js/tools/thumb-impression-resizer.entry.js")) {
      throw new Error("thumb-impression-resizer: stable entry bootstrap is missing");
    }
  } else if (html.includes(`/assets/js/tools/${tool.name}.entry.js`)) {
    throw new Error(`${tool.name}: stable entry URL leaked into generated HTML`);
  }

  verifiedEntryScripts += 1;
  await writeFile(pagePath, html, "utf8");
}

console.log(
  `New image-tools isolated loader: verified ${verifiedEntryScripts} new-tool entry modules; removed ${removedDirectModules} direct tool-module scripts. Existing working tools were not modified.`
);
