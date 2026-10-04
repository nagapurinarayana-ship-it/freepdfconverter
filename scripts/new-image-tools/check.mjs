import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// New image tools only. Existing working tools are intentionally excluded.
const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

// Sign PDF is also new, but it has its own PDF-specific implementation rather than the image-tool bootstrap.
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
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const allText = new Map();
for (const file of htmlFiles) allText.set(file, await readFile(file, "utf8"));

const failures = [];
const relativeFiles = files.map((file) => path.relative(dist, file).split(path.sep).join("/"));

for (const tool of NEW_IMAGE_TOOLS) {
  const entryPattern = new RegExp(String.raw`^assets/js/tools/${tool.name}\.entry\.[a-f0-9]{10}\.js$`);
  const modulePattern = new RegExp(String.raw`^assets/js/tools/${tool.name}\.tool\.[a-f0-9]{10}\.js$`);
  const entries = relativeFiles.filter((file) => entryPattern.test(file));
  const modules = relativeFiles.filter((file) => modulePattern.test(file));

  if (entries.length !== 1) failures.push(`${tool.name}: expected one fingerprinted entry asset, found ${entries.length}`);
  if (modules.length !== 1) failures.push(`${tool.name}: expected one fingerprinted tool asset, found ${modules.length}`);
  if (relativeFiles.includes(`assets/js/tools/${tool.name}.entry.js`)) failures.push(`${tool.name}: stable entry asset exists`);
  if (relativeFiles.includes(`assets/js/tools/${tool.name}.tool.js`)) failures.push(`${tool.name}: stable tool asset exists`);

  const html = allText.get(path.join(dist, tool.page));
  if (!html) {
    failures.push(`${tool.name}: page missing: ${tool.page}`);
    continue;
  }

  const entryHtmlMatches = html.match(new RegExp(
    `<script[^>]*${tool.name}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi"
  )) || [];
  if (entryHtmlMatches.length !== 1) failures.push(`${tool.name}: expected exactly one fingerprinted entry script, found ${entryHtmlMatches.length}`);
  else if (!/type=["']module["']/i.test(entryHtmlMatches[0])) failures.push(`${tool.name}: fingerprinted entry must remain a module script`);

  const directHtmlMatches = html.match(new RegExp(
    `<script[^>]*${tool.name}\\.tool\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi"
  )) || [];
  if (directHtmlMatches.length) failures.push(`${tool.name}: page directly loads the tool module`);

  if (html.includes(`/assets/js/tools/${tool.name}.entry.js`) || html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    failures.push(`${tool.name}: page contains a stable image-tool URL`);
  }

  if (entries.length === 1 && modules.length === 1) {
    const entrySource = await readFile(path.join(dist, entries[0]), "utf8");
    const imported = entrySource.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
    if (!new RegExp(String.raw`/${tool.name}\.tool\.[a-f0-9]{10}\.js$`).test(imported)) {
      failures.push(`${tool.name}: entry does not dynamically import its fingerprinted tool module`);
    } else if (!relativeFiles.includes(imported.replace(/^\//, ""))) {
      failures.push(`${tool.name}: dynamically imported module is missing: ${imported}`);
    }
  }
}

for (const tool of NEW_PDF_TOOLS) {
  const html = allText.get(path.join(dist, tool.page));
  if (!html) {
    failures.push(`${tool.name}: page missing: ${tool.page}`);
    continue;
  }
  if (!relativeFiles.includes(tool.script)) failures.push(`${tool.name}: implementation script missing: ${tool.script}`);
  if (!html.includes(tool.script)) failures.push(`${tool.name}: page does not load its implementation script`);
}

if (failures.length) throw new Error("New-tools isolated verification failed:\n- " + failures.join("\n- "));
console.log(`New-tools isolated verification passed: ${NEW_IMAGE_TOOLS.length} new image tools + ${NEW_PDF_TOOLS.length} new PDF tool.`);
