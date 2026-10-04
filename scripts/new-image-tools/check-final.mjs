import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const NEW_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html", fingerprintEntry: true },
  { name: "signature-resizer", page: "tools/signature-resizer.html", fingerprintEntry: true },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html", fingerprintEntry: false }
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

for (const tool of NEW_TOOLS) {
  const pageFile = path.join(dist, tool.page);
  const html = await readFile(pageFile, "utf8");
  const modulePattern = new RegExp(`^assets/js/tools/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`);
  const entryPattern = new RegExp(`^assets/js/tools/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`);
  const modules = relativeFiles.filter((file) => modulePattern.test(file));
  const entries = relativeFiles.filter((file) => entryPattern.test(file));

  if (modules.length !== 1) failures.push(`${tool.name}: expected one fingerprinted tool module, found ${modules.length}`);
  if (relativeFiles.includes(`assets/js/tools/${tool.name}.tool.js`)) failures.push(`${tool.name}: stable tool module exists`);

  const directModules = html.match(
    new RegExp(`<script[^>]*${tool.name}\\.tool\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
  ) || [];
  if (directModules.length) failures.push(`${tool.name}: page directly executes the tool module`);

  if (tool.fingerprintEntry) {
    if (entries.length !== 1) failures.push(`${tool.name}: expected one fingerprinted entry asset, found ${entries.length}`);
    if (relativeFiles.includes(`assets/js/tools/${tool.name}.entry.js`)) failures.push(`${tool.name}: stable entry remains`);

    const entryScripts = html.match(
      new RegExp(`<script[^>]*${tool.name}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
    ) || [];
    if (entryScripts.length !== 1) failures.push(`${tool.name}: expected one fingerprinted entry script, found ${entryScripts.length}`);
    else if (!/type=["']module["']/i.test(entryScripts[0])) failures.push(`${tool.name}: fingerprinted entry is not a module script`);

    if (entries.length === 1) {
      const source = await readFile(path.join(dist, entries[0]), "utf8");
      const imported = source.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
      if (!new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(imported)) failures.push(`${tool.name}: entry does not dynamically import its fingerprinted tool module`);
      else if (!relativeFiles.includes(imported.replace(/^\//, ""))) failures.push(`${tool.name}: entry imports missing module ${imported}`);
    }
  } else {
    if (entries.length) failures.push(`${tool.name}: fingerprinted entry asset exists alongside stable bootstrap`);
    if (!relativeFiles.includes(`assets/js/tools/${tool.name}.entry.js`)) failures.push(`${tool.name}: stable entry asset is missing`);

    const stableScripts = html.match(
      new RegExp(`<script[^>]*${tool.name}\\.entry\\.js[^>]*></script>`, "gi")
    ) || [];
    if (stableScripts.length !== 1) failures.push(`${tool.name}: expected one stable entry script, found ${stableScripts.length}`);
    else if (!/type=["']module["']/.test(stableScripts[0]) && !/defer/.test(stableScripts[0])) {
      failures.push(`${tool.name}: stable entry script has an unexpected loading contract`);
    }

    try {
      const source = await readFile(path.join(dist, "assets/js/tools", `${tool.name}.entry.js`), "utf8");
      const imported = source.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
      if (!new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(imported)) failures.push(`${tool.name}: stable entry does not import the fingerprinted tool module`);
      else if (!relativeFiles.includes(imported.replace(/^\//, ""))) failures.push(`${tool.name}: stable entry imports missing module ${imported}`);
    } catch {
      failures.push(`${tool.name}: stable entry could not be read`);
    }
  }
}

if (failures.length) throw new Error("Final isolated image-tool verification failed:\n- " + failures.join("\n- "));
console.log("Final isolated image-tool verification passed for exactly three new tools: Photo Compressor, Signature Resizer and Thumb Impression Resizer.");
