import { createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const toolsDir = path.join(dist, "assets/js/tools");

const NEW_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html", fingerprintEntry: true },
  { name: "signature-resizer", page: "tools/signature-resizer.html", fingerprintEntry: true },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html", fingerprintEntry: false }
];

const files = await readdir(toolsDir);

for (const tool of NEW_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");

  const modulePattern = new RegExp(
    `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
    "gi"
  );
  html = html.replace(modulePattern, "");

  if (tool.fingerprintEntry) {
    const stableEntryPath = path.join(toolsDir, `${tool.name}.entry.js`);
    const entrySource = await readFile(stableEntryPath, "utf8");
    const hash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
    const fingerprintedName = `${tool.name}.entry.${hash}.js`;
    await writeFile(path.join(toolsDir, fingerprintedName), entrySource, "utf8");
    await rm(stableEntryPath, { force: true });

    html = html.replace(
      new RegExp(
        `<script[^>]*(?:src=["'][^"']*/)?${tool.name}\\.entry\\.js["'][^>]*></script>`,
        "gi"
      ),
      `<script type="module" src="/assets/js/tools/${fingerprintedName}"></script>`
    );

    if (!html.includes(fingerprintedName)) {
      throw new Error(`${tool.name}: fingerprinted entry was not installed into the page`);
    }

    const serviceWorkerPath = path.join(dist, "service-worker.js");
    let serviceWorker = await readFile(serviceWorkerPath, "utf8");
    serviceWorker = serviceWorker.replace(
      new RegExp(`/assets/js/tools/${tool.name}\\.entry\\.js`, "g"),
      `/assets/js/tools/${fingerprintedName}`
    );
    await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  } else {
    if (!html.includes(`assets/js/tools/${tool.name}.entry.js`)) {
      throw new Error(`${tool.name}: required stable entry bootstrap is missing`);
    }
  }

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into generated HTML`);
  }

  await writeFile(pagePath, html, "utf8");
}

console.log(
  "Final isolated image strategy applied only to Photo Compressor, Signature Resizer and Thumb Impression Resizer; all other tools remain on the existing loader."
);
