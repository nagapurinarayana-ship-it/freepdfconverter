import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const NEW_IMAGE_TOOLS = [
  "photo-compressor",
  "signature-resizer",
  "passport-id-photo-maker",
  "thumb-impression-resizer",
  "handwritten-declaration-resizer"
];
const NEW_TOOL_PICKER_PAGES = [
  ["sign-pdf", "pdfFile"],
  ["photo-compressor", "imageFile"],
  ["signature-resizer", "signatureFile"],
  ["passport-id-photo-maker", "photoFile"],
  ["thumb-impression-resizer", "thumbFile"],
  ["handwritten-declaration-resizer", "declarationFile"]
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

  const modulePattern = new RegExp(`^assets/js/tools/${tool}\\.tool\\.[a-f0-9]{10}\\.js$`);
  const entryPattern = new RegExp(`^assets/js/tools/${tool}\\.entry\\.[a-f0-9]{10}\\.js$`);
  const modules = relativeFiles.filter((file) => modulePattern.test(file));
  const entries = relativeFiles.filter((file) => entryPattern.test(file));

  if (modules.length !== 1) failures.push(`${tool}: expected one fingerprinted tool module, found ${modules.length}`);
  if (entries.length !== 1) failures.push(`${tool}: expected one fingerprinted entry asset, found ${entries.length}`);
  if (relativeFiles.includes(`assets/js/tools/${tool}.tool.js`)) failures.push(`${tool}: stable tool module exists`);
  if (relativeFiles.includes(`assets/js/tools/${tool}.entry.js`)) failures.push(`${tool}: stable entry remains`);

  const directModules = html.match(
    new RegExp(`<script[^>]*${tool}\\.tool\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
  ) || [];
  if (directModules.length) failures.push(`${tool}: page directly executes the tool module`);

  const entryScripts = html.match(
    new RegExp(`<script[^>]*${tool}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
  ) || [];
  if (entryScripts.length !== 1) failures.push(`${tool}: expected one fingerprinted entry script in HTML, found ${entryScripts.length}`);
  else if (!/type=["']module["']/i.test(entryScripts[0])) failures.push(`${tool}: fingerprinted entry is not a module script`);

  const stableEntryScripts = html.match(
    new RegExp(`<script[^>]*${tool}\\.entry\\.js[^>]*></script>`, "gi")
  ) || [];
  if (stableEntryScripts.length) failures.push(`${tool}: stable entry URL leaked into HTML`);

  if (entries.length === 1) {
    const source = await readFile(path.join(dist, entries[0]), "utf8");
    const imported = source.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
    if (!new RegExp(`/${tool}\\.tool\\.[a-f0-9]{10}\\.js$`).test(imported)) {
      failures.push(`${tool}: fingerprinted entry does not dynamically import its fingerprinted tool module`);
    } else if (!relativeFiles.includes(imported.replace(/^\//, ""))) {
      failures.push(`${tool}: fingerprinted entry imports missing module ${imported}`);
    }
  }
}

for (const [page, inputId] of NEW_TOOL_PICKER_PAGES) {
  const html = await readFile(path.join(dist, `tools/${page}.html`), "utf8");
  if (!html.includes(`id="${inputId}"`)) failures.push(`${page}: picker input missing`);
  if (!html.includes(`id="${inputId}"`) || !html.includes("data-new-tool-picker")) {
    failures.push(`${page}: Android picker marker missing`);
  }
  if (!html.includes("/assets/js/new-tool-mobile-picker.js")) {
    failures.push(`${page}: Android picker script missing`);
  }
}

if (!relativeFiles.includes("assets/js/new-tool-mobile-picker.js")) {
  failures.push("new-tool-mobile-picker.js: asset missing");
}

// Sign PDF is also new, but it uses the normal fingerprinted application-script
// contract rather than the image-tool entry/module bootstrap.
try {
  const signPage = await readFile(path.join(dist, "tools/sign-pdf.html"), "utf8");
  const signScripts = relativeFiles.filter((file) => /^assets\/js\/sign-pdf\.[a-f0-9]{10}\.js$/.test(file));
  if (signScripts.length !== 1) failures.push(`sign-pdf: expected one fingerprinted implementation script, found ${signScripts.length}`);
  else if (!signPage.includes(`../${signScripts[0]}`) && !signPage.includes(`/${signScripts[0]}`)) {
    failures.push(`sign-pdf: page does not reference its fingerprinted implementation script`);
  }
  if (relativeFiles.includes("assets/js/sign-pdf.js")) failures.push("sign-pdf: stable implementation asset exists");
} catch {
  failures.push("sign-pdf: page missing");
}

if (failures.length) {
  throw new Error("New-tool isolated verification failed:\n- " + failures.join("\n- "));
}

console.log(
  "New-tool isolated verification passed: all six new tools verified, including Android picker handling limited to the six new tool pages. Existing working tools are outside the new-tool strategy."
);
