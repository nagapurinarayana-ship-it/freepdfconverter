import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const WORKING_TOOLS = [
  "passport-id-photo-maker",
  "handwritten-declaration-resizer"
];

const toolsDir = path.join(dist, "assets/js/tools");
const toolFiles = await readdir(toolsDir);
const entryMappings = [];

for (const tool of WORKING_TOOLS) {
  const match = toolFiles.find((file) =>
    new RegExp(`^${tool}\\.entry\\.[a-f0-9]{10}\\.js$`).test(file)
  );

  if (!match) {
    throw new Error(`${tool}: fingerprinted working entry asset missing`);
  }

  const source = path.join(toolsDir, match);
  const stable = path.join(toolsDir, `${tool}.entry.js`);
  await rename(source, stable);

  entryMappings.push({
    oldPath: `/assets/js/tools/${match}`,
    stablePath: `/assets/js/tools/${tool}.entry.js`
  });
}

const htmlFiles = [];
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
  }
};
await walk(dist);

for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");

  for (const tool of WORKING_TOOLS) {
    const directModule = new RegExp(
      `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
      "gi"
    );
    html = html.replace(directModule, "");

    const fingerprintedEntry = new RegExp(
      `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool}\\.entry\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
      "gi"
    );
    html = html.replace(
      fingerprintedEntry,
      `<script src="../assets/js/tools/${tool}.entry.js" defer></script>`
    );
  }

  await writeFile(file, html, "utf8");
}

const serviceWorkerPath = path.join(dist, "service-worker.js");
let serviceWorker = await readFile(serviceWorkerPath, "utf8");
for (const mapping of entryMappings) {
  serviceWorker = serviceWorker.split(mapping.oldPath).join(mapping.stablePath);
}
await writeFile(serviceWorkerPath, serviceWorker, "utf8");

console.log(
  `Working image-tool compatibility preserved separately: ${WORKING_TOOLS.join(", ")}. No working tool implementation files were modified.`
);
