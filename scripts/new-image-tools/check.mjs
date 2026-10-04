import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// Five new image tools use the isolated bootstrap strategy. Sign PDF is new too,
// but its normal fingerprinted application script does not need an image bootstrap.
const NEW_IMAGE_TOOLS = [
  "photo-compressor",
  "signature-resizer",
  "passport-id-photo-maker",
  "thumb-impression-resizer",
  "handwritten-declaration-resizer"
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
  const pageFile = path.join(dist, `tools/${tool}.html`);
  let html;
  try {
    html = await readFile(pageFile, "utf8");
  } catch {
    failures.push(`${tool}: page missing`);
    continue;
  }

  const stableEntry = `assets/js/tools/${tool}.entry.js`;
  const stableModule = `assets/js/tools/${tool}.tool.js`;
  const entryPattern = new RegExp(`^assets/js/tools/${tool}\\.entry\\.[a-f0-9]{10}\\.js$`);
  const modulePattern = new RegExp(`^assets/js/tools/${tool}\\.tool\\.[a-f0-9]{10}\\.js$`);
  const entries = relativeFiles.filter((file) => entryPattern.test(file));
  const modules = relativeFiles.filter((file) => modulePattern.test(file));

  if (entries.length !== 1) failures.push(`${tool}: expected exactly one fingerprinted entry module, found ${entries.length}`);
  if (modules.length !== 1) failures.push(`${tool}: expected exactly one fingerprinted tool module, found ${modules.length}`);
  if (relativeFiles.includes(stableEntry)) failures.push(`${tool}: stable entry asset exists`);
  if (relativeFiles.includes(stableModule)) failures.push(`${tool}: stable tool module exists`);

  const entryScripts = html.match(new RegExp(`<script[^>]*${tool}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")) || [];
  if (entryScripts.length !== 1) failures.push(`${tool}: expected exactly one fingerprinted entry script in HTML, found ${entryScripts.length}`);
  else if (!/type=["']module["']/i.test(entryScripts[0])) failures.push(`${tool}: fingerprinted entry must be a module script`);

  const stableEntryScripts = html.match(new RegExp(`<script[^>]*${tool}\\.entry\\.js[^>]*></script>`, "gi")) || [];
  if (stableEntryScripts.length) failures.push(`${tool}: stable entry URL leaked into HTML`);

  const directToolScripts = html.match(new RegExp(`<script[^>]*${tool}\\.tool\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")) || [];
  if (directToolScripts.length) failures.push(`${tool}: page directly loads the tool module instead of the entry bootstrap`);

  if (entries.length === 1) {
    const source = await readFile(path.join(dist, entries[0]), "utf8");
    const imported = source.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
    const expected = new RegExp(`/${tool}\\.tool\\.[a-f0-9]{10}\\.js$`);
    if (!expected.test(imported)) failures.push(`${tool}: fingerprinted entry does not import its fingerprinted tool module`);
    else if (!relativeFiles.includes(imported.replace(/^\//, ""))) failures.push(`${tool}: fingerprinted entry imports missing module: ${imported}`);
  }
}

const signPage = path.join(dist, "tools/sign-pdf.html");
try {
  const html = await readFile(signPage, "utf8");
  const scripts = relativeFiles.filter((file) => /^assets\/js\/sign-pdf\.[a-f0-9]{10}\.js$/.test(file));
  if (scripts.length !== 1) failures.push(`sign-pdf: expected exactly one fingerprinted implementation script, found ${scripts.length}`);
  else if (!html.includes(`../${scripts[0]}`)) failures.push(`sign-pdf: page does not load ${scripts[0]}`);
  if (relativeFiles.includes("assets/js/sign-pdf.js")) failures.push("sign-pdf: stable implementation asset exists");
} catch {
  failures.push("sign-pdf: page missing");
}

if (failures.length) throw new Error("New-tools isolated verification failed:\n- " + failures.join("\n- "));

console.log("New-tools isolated verification passed: 5 new image tools use isolated fingerprinted entry -> fingerprinted module bootstraps, and Sign PDF uses its normal fingerprinted application script. Existing working tools are outside this strategy and check.");
