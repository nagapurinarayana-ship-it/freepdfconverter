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

const files = await readdir(toolsDir);
let removedDirectModules = 0;

for (const tool of NEW_IMAGE_TOOLS) {
  const moduleFiles = files.filter((file) =>
    new RegExp(`^${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(file)
  );

  if (moduleFiles.length !== 1) {
    throw new Error(`${tool.name}: expected exactly one fingerprinted tool module, found ${moduleFiles.length}`);
  }

  const modulePath = `/assets/js/tools/${moduleFiles[0]}`;
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

  const entrySource = [
    `import("${modulePath}").then(function (module) { return module.mount(); });`,
    ""
  ].join("\n");

  const hash = createHash("sha256").update(entrySource).digest("hex").slice(0, 10);
  const fingerprintedEntry = `${tool.name}.entry.${hash}.js`;
  const fingerprintedEntryPath = path.join(toolsDir, fingerprintedEntry);

  await writeFile(fingerprintedEntryPath, entrySource, "utf8");

  for (const oldEntry of files.filter((file) =>
    new RegExp(`^${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`).test(file) &&
    file !== fingerprintedEntry
  )) {
    await rm(path.join(toolsDir, oldEntry), { force: true });
  }

  const serviceWorkerPath = path.join(dist, "service-worker.js");
  let serviceWorker = await readFile(serviceWorkerPath, "utf8");

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

    serviceWorker = serviceWorker.replace(
      new RegExp(`/assets/js/tools/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js`, "g"),
      `/assets/js/tools/${tool.name}.entry.js`
    );
  } else {
    const entryRef = `/assets/js/tools/${fingerprintedEntry}`;

    html = html.replace(
      new RegExp(
        `<script[^>]*${tool.name}\\.entry(?:\\.[a-f0-9]{10})?\\.js[^>]*></script>`,
        "gi"
      ),
      `<script type="module" src="${entryRef}"></script>`
    );

    if (!html.includes(fingerprintedEntry)) {
      throw new Error(`${tool.name}: fingerprinted entry script was not installed into the page`);
    }

    serviceWorker = serviceWorker.replace(
      new RegExp(`/assets/js/tools/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js`, "g"),
      entryRef
    );
  }

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into HTML`);
  }

  if (tool.stableEntry && !html.includes("assets/js/tools/thumb-impression-resizer.entry.js")) {
    throw new Error("thumb-impression-resizer: stable entry bootstrap missing");
  }

  await writeFile(pagePath, html, "utf8");
  await writeFile(serviceWorkerPath, serviceWorker, "utf8");
}

console.log(
  `New isolated strategy applied ONLY to Photo Compressor, Signature Resizer and Thumb Impression Resizer; removed ${removedDirectModules} direct tool-module scripts. Existing tools were excluded.`
);
