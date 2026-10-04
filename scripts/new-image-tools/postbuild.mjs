import { createHash } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const toolsDir = path.join(dist, "assets/js/tools");

// ALL FIVE new image tools use the isolated fingerprinted-entry strategy.
const NEW_IMAGE_TOOLS = [
  "photo-compressor",
  "signature-resizer",
  "passport-id-photo-maker",
  "thumb-impression-resizer",
  "handwritten-declaration-resizer"
];

const files = await readdir(toolsDir);
let removedDirectModules = 0;

for (const tool of NEW_IMAGE_TOOLS) {
  const moduleFiles = files.filter((file) => new RegExp(`^${tool}\\.tool\\.[a-f0-9]{10}\\.js$`).test(file));
  if (moduleFiles.length !== 1) throw new Error(`${tool}: expected exactly one fingerprinted tool module, found ${moduleFiles.length}`);

  const modulePath = `/assets/js/tools/${moduleFiles[0]}`;
  const pagePath = path.join(dist, `tools/${tool}.html`);
  let html = await readFile(pagePath, "utf8");

  const directModule = new RegExp(`<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`, "gi");
  const directMatches = html.match(directModule);
  if (directMatches?.length) {
    removedDirectModules += directMatches.length;
    html = html.replace(directModule, "");
  }

  const entrySource = `import("${modulePath}").then(function (module) { return module.mount(); });\n`;
  const hash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const fingerprintedEntry = `${tool}.entry.${hash}.js`;
  await writeFile(path.join(toolsDir, fingerprintedEntry), entrySource, "utf8");

  for (const oldEntry of files.filter((file) => new RegExp(`^${tool}\\.entry\\.[a-f0-9]{10}\\.js$`).test(file) && file !== fingerprintedEntry)) {
    await rm(path.join(toolsDir, oldEntry), { force: true });
  }

  const entryRef = `/assets/js/tools/${fingerprintedEntry}`;
  html = html.replace(
    new RegExp(`<script[^>]*${tool}\\.entry(?:\\.[a-f0-9]{10})?\\.js[^>]*></script>`, "gi"),
    `<script type="module" src="${entryRef}"></script>`
  );
  if (!html.includes(entryRef)) throw new Error(`${tool}: fingerprinted entry script was not installed into the page`);
  if (html.includes(`/assets/js/tools/${tool}.tool.js`)) throw new Error(`${tool}: stable tool-module URL leaked into HTML`);
  if (html.includes(`/assets/js/tools/${tool}.entry.js`)) throw new Error(`${tool}: stable entry URL leaked into HTML`);

  const serviceWorkerPath = path.join(dist, "service-worker.js");
  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replace(new RegExp(`/assets/js/tools/${tool}\\.entry\\.[a-f0-9]{10}\\.js`, "g"), entryRef);
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  await writeFile(pagePath, html, "utf8");
}

console.log(`New isolated strategy applied to all ${NEW_IMAGE_TOOLS.length} new image tools; removed ${removedDirectModules} direct tool-module scripts. Existing working tools were excluded.`);
