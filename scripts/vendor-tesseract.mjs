import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const tesseract = path.join(root, "node_modules", "tesseract.js");
const core = path.join(root, "node_modules", "tesseract.js-core");
const target = path.join(root, "assets", "vendor", "tesseract");
const coreTarget = path.join(target, "core");
const langTarget = path.join(target, "lang");

const LANGUAGES = [
  ["eng", "ENGLISH"],
  ["deu", "GERMAN"],
  ["fra", "FRENCH"],
  ["spa", "SPANISH"]
];

async function findTrainedData(packageCode) {
  const packageRoot = path.join(root, "node_modules", "@tesseract.js-data", packageCode);
  const candidates = [];

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name === packageCode + ".traineddata.gz") candidates.push(full);
    }
  }

  await walk(packageRoot);
  if (!candidates.length) throw new Error("OCR language data is missing: " + packageCode);
  return candidates[0];
}

for (const required of [
  path.join(tesseract, "package.json"),
  path.join(tesseract, "dist", "tesseract.min.js"),
  path.join(tesseract, "dist", "worker.min.js"),
  path.join(core, "package.json")
]) {
  try { await import("node:fs/promises").then(({ readFile }) => readFile(required)); } catch {
    console.error("OCR dependency is missing: " + required);
    console.error("Run npm install before building FreePDF Tools.");
    process.exit(1);
  }
}

const languageFiles = new Map();
for (const [code] of LANGUAGES) languageFiles.set(code, await findTrainedData(code));

await rm(target, { recursive: true, force: true });
await mkdir(coreTarget, { recursive: true });
await mkdir(langTarget, { recursive: true });

await cp(path.join(tesseract, "dist", "tesseract.min.js"), path.join(target, "tesseract.min.js"));
await cp(path.join(tesseract, "dist", "worker.min.js"), path.join(target, "worker.min.js"));

const coreFiles = (await readdir(core)).filter((name) => /^tesseract-core.*\.(?:js|wasm)$/.test(name));
for (const name of coreFiles) await cp(path.join(core, name), path.join(coreTarget, name));

for (const [code] of LANGUAGES) {
  await cp(languageFiles.get(code), path.join(langTarget, code + ".traineddata.gz"));
}

await writeFile(path.join(target, "LICENSE-TESSERACT-JS.txt"), await (await import("node:fs/promises")).readFile(path.join(tesseract, "LICENSE.md"), "utf8"), "utf8");
await writeFile(path.join(target, "LICENSE-TESSERACT-CORE.txt"), await (await import("node:fs/promises")).readFile(path.join(core, "LICENSE"), "utf8"), "utf8");

for (const [code] of LANGUAGES) {
  const readme = path.join(root, "node_modules", "@tesseract.js-data", code, "README.md");
  try {
    const text = await (await import("node:fs/promises")).readFile(readme, "utf8");
    await writeFile(path.join(target, "LICENSE-" + code.toUpperCase() + "-DATA.txt"), text, "utf8");
  } catch {}
}

console.log("Vendored Tesseract.js 7 OCR runtime and local English, German, French and Spanish trained data.");
