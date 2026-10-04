import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html", stableEntry: false },
  { name: "signature-resizer", page: "tools/signature-resizer.html", stableEntry: false },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html", stableEntry: true }
];

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

const files = await walk(dist);
const relativeFiles = files.map((file) => path.relative(dist, file).split(path.sep).join("/"));
const failures = [];

for (const tool of NEW_IMAGE_TOOLS) {
  const pageFile = path.join(dist, tool.page);
  let html;
  try {
    html = await readFile(pageFile, "utf8");
  } catch {
    failures.push(`${tool.name}: page missing: ${tool.page}`);
    continue;
  }

  const stableEntry = `assets/js/tools/${tool.name}.entry.js`;
  const stableModule = `assets/js/tools/${tool.name}.tool.js`;
  const entryPattern = new RegExp(`^assets/js/tools/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`);
  const modulePattern = new RegExp(`^assets/js/tools/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`);
  const entries = relativeFiles.filter((file) => entryPattern.test(file));
  const modules = relativeFiles.filter((file) => modulePattern.test(file));

  if (modules.length !== 1) failures.push(`${tool.name}: expected exactly one fingerprinted tool module, found ${modules.length}`);
  if (relativeFiles.includes(stableModule)) failures.push(`${tool.name}: stable tool module exists`);

  const directToolScripts = html.match(new RegExp(`<script[^>]*${tool.name}\\.tool\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")) || [];
  if (directToolScripts.length) failures.push(`${tool.name}: page directly loads the tool module`);

  if (tool.stableEntry) {
    if (!relativeFiles.includes(stableEntry)) failures.push(`${tool.name}: stable entry bootstrap is missing`);
    if (entries.length) failures.push(`${tool.name}: fingerprinted entry asset leaked alongside stable bootstrap`);

    const stableScripts = html.match(new RegExp(`<script[^>]*${tool.name}\\.entry\\.js[^>]*></script>`, "gi")) || [];
    if (stableScripts.length !== 1) failures.push(`${tool.name}: expected exactly one stable entry script, found ${stableScripts.length}`);
    else if (!/type=["']module["']/i.test(stableScripts[0])) failures.push(`${tool.name}: stable entry must be a module script`);

    try {
      const source = await readFile(path.join(dist, stableEntry), "utf8");
      const imported = source.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
      if (!new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(imported)) failures.push(`${tool.name}: stable entry does not import its fingerprinted tool module`);
      else if (!relativeFiles.includes(imported.replace(/^\//, ""))) failures.push(`${tool.name}: stable entry imports missing module: ${imported}`);
    } catch {
      failures.push(`${tool.name}: stable entry cannot be read`);
    }
  } else {
    if (entries.length !== 1) failures.push(`${tool.name}: expected exactly one fingerprinted entry asset, found ${entries.length}`);
    if (relativeFiles.includes(stableEntry)) failures.push(`${tool.name}: stable entry asset exists`);

    const entryScripts = html.match(new RegExp(`<script[^>]*${tool.name}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")) || [];
    if (entryScripts.length !== 1) failures.push(`${tool.name}: expected exactly one fingerprinted entry script, found ${entryScripts.length}`);
    else if (!/type=["']module["']/i.test(entryScripts[0])) failures.push(`${tool.name}: fingerprinted entry must be a module script`);

    if (entries.length === 1) {
      const source = await readFile(path.join(dist, entries[0]), "utf8");
      const imported = source.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
      if (!new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(imported)) failures.push(`${tool.name}: entry does not import its fingerprinted tool module`);
      else if (!relativeFiles.includes(imported.replace(/^\//, ""))) failures.push(`${tool.name}: entry imports missing module: ${imported}`);
    }
  }
}

if (failures.length) {
  throw new Error("New image-tools isolated verification failed:\n- " + failures.join("\n- "));
}

console.log("New image-tools isolated verification passed for exactly three tools: Photo Compressor, Signature Resizer and Thumb Impression Resizer.");
