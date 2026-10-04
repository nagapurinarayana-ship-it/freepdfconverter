import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// All six tools shown in the new-tools UI are NEW. Existing working tools are excluded.
const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

const NEW_PDF_TOOLS = [
  { name: "sign-pdf", page: "tools/sign-pdf.html", script: "assets/js/sign-pdf.js" }
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

  if (entries.length !== 1) failures.push(`${tool.name}: expected exactly one fingerprinted entry module, found ${entries.length}`);
  if (modules.length !== 1) failures.push(`${tool.name}: expected exactly one fingerprinted tool module, found ${modules.length}`);
  if (relativeFiles.includes(stableEntry)) failures.push(`${tool.name}: stable entry asset exists`);
  if (relativeFiles.includes(stableModule)) failures.push(`${tool.name}: stable tool module exists`);

  const entryScripts = html.match(new RegExp(`<script[^>]*${tool.name}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")) || [];
  if (entryScripts.length !== 1) failures.push(`${tool.name}: expected exactly one fingerprinted entry script in HTML, found ${entryScripts.length}`);
  else if (!/type=["']module["']/i.test(entryScripts[0])) failures.push(`${tool.name}: fingerprinted entry must be a module script`);

  const leakedStableEntry = html.match(new RegExp(`<script[^>]*${tool.name}\\.entry\\.js[^>]*></script>`, "gi")) || [];
  if (leakedStableEntry.length) failures.push(`${tool.name}: stable entry URL leaked into HTML`);

  const directToolScripts = html.match(new RegExp(`<script[^>]*${tool.name}\\.tool\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")) || [];
  if (directToolScripts.length) failures.push(`${tool.name}: page directly loads the tool module instead of the entry bootstrap`);

  if (entries.length === 1) {
    const source = await readFile(path.join(dist, entries[0]), "utf8");
    const imported = source.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
    const expected = new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`);
    if (!expected.test(imported)) failures.push(`${tool.name}: fingerprinted entry does not import its fingerprinted tool module`);
    else if (!relativeFiles.includes(imported.replace(/^\//, ""))) failures.push(`${tool.name}: fingerprinted entry imports missing module: ${imported}`);
  }
}

for (const tool of NEW_PDF_TOOLS) {
  const pageFile = path.join(dist, tool.page);
  let html;
  try {
    html = await readFile(pageFile, "utf8");
  } catch {
    failures.push(`${tool.name}: page missing: ${tool.page}`);
    continue;
  }
  if (!relativeFiles.includes(tool.script)) failures.push(`${tool.name}: implementation script missing: ${tool.script}`);
  if (!html.includes(tool.script)) failures.push(`${tool.name}: page does not load its implementation script`);
}

if (failures.length) throw new Error("New-tools isolated verification failed:\n- " + failures.join("\n- "));

console.log("New-tools isolated verification passed: 5 new image tools + Sign PDF. Existing working tools are outside this strategy and check.");
