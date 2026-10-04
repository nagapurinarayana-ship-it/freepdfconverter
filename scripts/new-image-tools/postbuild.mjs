import { createHash } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const toolsDir = path.join(dist, "assets/js/tools");

const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html", stableEntry: false },
  { name: "signature-resizer", page: "tools/signature-resizer.html", stableEntry: false },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html", stableEntry: true }
];

let removedDirectModules = 0;

const files = await readdir(toolsDir);

for (const tool of NEW_IMAGE_TOOLS) {
  const moduleFiles = files.filter((file) =>
    new RegExp(`^${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(file)
  );

  if (moduleFiles.length !== 1) {
    throw new Error(
      `${tool.name}: expected exactly one fingerprinted tool module, found ${moduleFiles.length}`
    );
  }

  const moduleFile = moduleFiles[0];
  const modulePath = `/assets/js/tools/${moduleFile}`;

  const directModulePattern = new RegExp(
    `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
    "gi"
  );

  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");
  const directMatches = html.match(directModulePattern);
  if (directMatches?.length) {
    removedDirectModules += directMatches.length;
    html = html.replace(directModulePattern, "");
  }

  const entrySource = [
    "(function () {",
    '  "use strict";',
    `  import("${modulePath}")`,
    "    .then(function (module) { return module.mount(); })",
    "    .catch(function (error) {",
    `      console.error("FreePDF tool failed to initialize: ${tool.name}", error);`,
    "      var status = document.querySelector('[role="status"]');",
    "      if (status && window.FreePDF?.setStatus) {",
    '        window.FreePDF.setStatus(status, "This tool could not start correctly. Refresh the page and try again.", "error");',
    "      }",
    "    });",
    "}());",
    ""
  ].join("\n");

  const hash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const fingerprintedEntry = `${tool.name}.entry.${hash}.js`;
  await writeFile(path.join(toolsDir, fingerprintedEntry), entrySource, "utf8");

  const oldEntryFiles = files.filter((file) =>
    new RegExp(`^${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`).test(file) &&
    file !== fingerprintedEntry
  );
  for (const oldEntry of oldEntryFiles) {
    await rm(path.join(toolsDir, oldEntry), { force: true });
  }

  const entryRef = `/assets/js/tools/${fingerprintedEntry}`;
  if (tool.stableEntry) {
    const stableEntry = `${tool.name}.entry.js`;
    await writeFile(path.join(toolsDir, stableEntry), entrySource, "utf8");

    html = html.replace(
      new RegExp(
        `<script[^>]*${tool.name}\\.entry(?:\\.[a-f0-9]{10})?\\.js[^>]*></script>`,
        "gi"
      ),
      '<script type="module" src="../assets/js/tools/thumb-impression-resizer.entry.js"></script>'
    );

    const serviceWorkerPath = path.join(dist, "service-worker.js");
    let serviceWorker = await readFile(serviceWorkerPath, "utf8");
    serviceWorker = serviceWorker.replace(
      new RegExp(`/assets/js/tools/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js`, "g"),
      `/assets/js/tools/${tool.name}.entry.js`
    );
    await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  } else {
    html = html.replace(
      new RegExp(
        `<script[^>]*${tool.name}\\.entry(?:\\.[a-f0-9]{10})?\\.js[^>]*></script>`,
        "gi"
      ),
      `<script type="module" src="${entryRef}"></script>`
    );

    const serviceWorkerPath = path.join(dist, "service-worker.js");
    let serviceWorker = await readFile(serviceWorkerPath, "utf8");
    serviceWorker = serviceWorker.replace(
      new RegExp(`/assets/js/tools/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js`, "g"),
      entryRef
    );
    await writeFile(serviceWorkerPath, serviceWorker, "utf8");
  }

  if (!html.includes(tool.stableEntry ? `${tool.name}.entry.js` : fingerprintedEntry)) {
    throw new Error(`${tool.name}: generated entry script was not installed into the page`);
  }

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into generated HTML`);
  }

  await writeFile(pagePath, html, "utf8");
}

console.log(
  `New image-tools isolated loader: generated isolated entry bootstraps for Photo Compressor, Signature Resizer and Thumb Impression Resizer; removed ${removedDirectModules} direct tool-module scripts. Existing working tools were not modified.`
);
