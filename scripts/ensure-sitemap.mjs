import { access, copyFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "sitemap.xml");
const target = path.join(root, "dist", "sitemap.xml");

try {
  await access(target);
  console.log("Sitemap already present in dist");
} catch {
  await copyFile(source, target);
  console.log("Copied fallback sitemap.xml into dist");
}
