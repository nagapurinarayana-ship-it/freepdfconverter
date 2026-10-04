import { createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const toolsDir = path.join(dist, "assets/js/tools");

const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

const serviceWorkerPath = path.join(dist, "service-worker.js");
const files = await readdir(toolsDir);

for (const tool of NEW_IMAGE_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");

  const modulePattern = new RegExp(
    `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
    "gi"
  );
  html = html.replace(modulePattern, "");

  const stableEntryPath = path.join(toolsDir, `${tool.name}.entry.js`);
  const entrySource = await readFile(stableEntryPath, "utf8");
  const hash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const fingerprintedName = `${tool.name}.entry.${hash}.js`;

  await writeFile(path.join(toolsDir, fingerprintedName), entrySource, "utf8");
  await rm(stableEntryPath, { force: true });

  // Remove stale fingerprinted entry variants for this tool.
  for (const oldEntry of files.filter((file) =>
    new RegExp(`^${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`).test(file) &&
    file !== fingerprintedName
  )) {
    await rm(path.join(toolsDir, oldEntry), { force: true });
  }

  const entryScript = `<script type="module" src="/assets/js/tools/${fingerprintedName}"></script>`;
  const entryPattern = new RegExp(
    `<script[^>]*(?:src=["'][^"']*/)?${tool.name}\\.entry(?:\\.[a-f0-9]{10})?\\.js["'][^>]*></script>`,
    "gi"
  );

  const nextHtml = html.replace(entryPattern, entryScript);
  if (nextHtml === html && !html.includes(fingerprintedName)) {
    throw new Error(`${tool.name}: could not install fingerprinted entry script`);
  }
  html = nextHtml;

  if (!html.includes(fingerprintedName)) {
    throw new Error(`${tool.name}: fingerprinted entry was not installed into the page`);
  }

  let serviceWorker = await readFile(serviceWorkerPath, "utf8");
  serviceWorker = serviceWorker.replace(
    new RegExp(`/assets/js/tools/${tool.name}\\.entry\\.js`, "g"),
    `/assets/js/tools/${fingerprintedName}`
  );
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into generated HTML`);
  }

  await writeFile(pagePath, html, "utf8");
}

console.log(
  "Final isolated image strategy applied ONLY to the five new image tools: Photo Compressor, Signature Resizer, Passport & ID Photo Maker, Thumb Impression Resizer, and Handwritten Declaration Resizer. Existing working tools remain on their existing loader."
);
