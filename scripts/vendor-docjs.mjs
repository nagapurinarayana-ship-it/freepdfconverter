import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "node_modules", "@file-viewer", "doc");
const sourceDist = path.join(source, "dist");
const target = path.join(root, "assets", "vendor", "docjs");

try {
  await readFile(path.join(source, "package.json"), "utf8");
} catch {
  console.error("@file-viewer/doc is not installed. Run npm install before building FreePDF Tools.");
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(sourceDist, target, { recursive: true });
await writeFile(path.join(target, "LICENSE.txt"), await readFile(path.join(source, "LICENSE"), "utf8"), "utf8");

console.log("Vendored @file-viewer/doc browser parser into assets/vendor/docjs.");
