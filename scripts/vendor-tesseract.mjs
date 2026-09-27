import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const tesseract = path.join(root, "node_modules", "tesseract.js");
const core = path.join(root, "node_modules", "tesseract.js-core");
const lang = path.join(root, "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
const target = path.join(root, "assets", "vendor", "tesseract");
const coreTarget = path.join(target, "core");
const langTarget = path.join(target, "lang");

for (const required of [
  path.join(tesseract, "package.json"),
  path.join(tesseract, "dist", "tesseract.min.js"),
  path.join(tesseract, "dist", "worker.min.js"),
  path.join(core, "package.json"),
  path.join(lang, "eng.traineddata.gz")
]) {
  try { await readFile(required); } catch {
    console.error("OCR dependency is missing: " + required);
    console.error("Run npm install before building FreePDF Tools.");
    process.exit(1);
  }
}

await rm(target, { recursive: true, force: true });
await mkdir(coreTarget, { recursive: true });
await mkdir(langTarget, { recursive: true });

await cp(path.join(tesseract, "dist", "tesseract.min.js"), path.join(target, "tesseract.min.js"));
await cp(path.join(tesseract, "dist", "worker.min.js"), path.join(target, "worker.min.js"));

const coreFiles = (await readdir(core)).filter((name) => /^tesseract-core.*\.(?:js|wasm)$/.test(name));
for (const name of coreFiles) await cp(path.join(core, name), path.join(coreTarget, name));

await cp(path.join(lang, "eng.traineddata.gz"), path.join(langTarget, "eng.traineddata.gz"));

await writeFile(path.join(target, "LICENSE-TESSERACT-JS.txt"), await readFile(path.join(tesseract, "LICENSE.md"), "utf8"), "utf8");
await writeFile(path.join(target, "LICENSE-TESSERACT-CORE.txt"), await readFile(path.join(core, "LICENSE"), "utf8"), "utf8");
await writeFile(path.join(target, "LICENSE-ENGLISH-DATA.txt"), await readFile(path.join(root, "node_modules", "@tesseract.js-data", "eng", "README.md"), "utf8"), "utf8");

console.log("Vendored Tesseract.js 7 OCR runtime, core builds and English trained data.");
