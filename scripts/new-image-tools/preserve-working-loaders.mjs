import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

const PRESERVED_TOOLS = [
  "passport-id-photo-maker",
  "handwritten-declaration-resizer"
];

const toolsDir = path.join(dist, "assets/js/tools");
const files = await readdir(toolsDir);

const entryMappings = [];

for (const file of files) {
  const match = file.match(new RegExp(`^(${PRESERVED_TOOLS.join("|")})\\.entry\\.([a-f0-9]{10})\\.js$`));
  if (!match) continue;

  const oldPath = `/assets/js/tools/${file}`;
  const stableFile = `${match[1]}.entry.js`;
  const stablePath = `/assets/js/tools/${stableFile}`;

  await rename(path.join(toolsDir, file), path.join(toolsDir, stableFile));
  entryMappings.push([oldPath, stablePath]);
}

if (entryMappings.length) {
  const textFiles = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/(?:html|js|json|webmanifest)$/i.test(entry.name) || entry.name === "service-worker.js") {
        textFiles.push(full);
      }
    }
  };

  await walk(dist);

  for (const file of textFiles) {
    let content = await readFile(file, "utf8");
    for (const [oldPath, stablePath] of entryMappings) {
      content = content.split(oldPath).join(stablePath);
    }
    await writeFile(file, content, "utf8");
  }
}

const htmlFiles = [];
const walkHtml = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkHtml(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(full);
  }
};
await walkHtml(dist);

for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");

  for (const tool of PRESERVED_TOOLS) {
    const directModule = new RegExp(
      `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
      "gi"
    );
    html = html.replace(directModule, "");

    const entryModule = new RegExp(
      `<script\\s+type=["']module["']\\s+src=["']([^"']*/${tool}\\.entry\\.js)["']></script>`,
      "gi"
    );
    html = html.replace(entryModule, '<script src="$1" defer></script>');
  }

  await writeFile(file, html, "utf8");
}

console.log(
  `Preserved working image-tool loaders: ${PRESERVED_TOOLS.join(", ")}. New-tool strategy remains isolated from these loaders.`
);
