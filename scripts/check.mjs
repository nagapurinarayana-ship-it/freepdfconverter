import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const required = [
  "index.html", "about.html", "privacy.html", "terms.html", "contact.html",
  "tools/merge-pdf.html", "tools/split-pdf.html", "tools/rotate-pdf.html",
  "tools/jpg-to-pdf.html", "tools/pdf-to-image.html", "tools/watermark-pdf.html",
  "assets/js/common.js", "assets/js/merge-pdf.js", "assets/js/split-pdf.js",
  "assets/js/rotate-pdf.js", "assets/js/jpg-to-pdf.js", "assets/js/pdf-to-image.js",
  "assets/js/watermark-pdf.js", "assets/css/styles.css"
];
for (const relative of required) await access(path.join(root, relative));

async function htmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "dist" && entry.name !== "node_modules") result.push(...await htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) result.push(full);
  }
  return result;
}

const broken = [];
for (const file of await htmlFiles(root)) {
  const html = await readFile(file, "utf8");
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const href of refs) {
    if (/^(?:https?:|#|data:|mailto:)/.test(href)) continue;
    const clean = href.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = path.resolve(path.dirname(file), clean);
    try { await access(target); } catch { broken.push(path.relative(root, file) + " -> " + href); }
  }
}
if (broken.length) {
  console.error("Broken local references:\n" + broken.join("\n"));
  process.exit(1);
}
console.log("Static checks passed: required files exist and local HTML references resolve.");
