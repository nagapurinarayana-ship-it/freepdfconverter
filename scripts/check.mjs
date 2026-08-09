import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { indexablePages } from "./site-config.mjs";

const root = process.cwd();
const required = [
  "index.html", "about.html", "privacy.html", "terms.html", "contact.html",
  "tools/merge-pdf.html", "tools/split-pdf.html", "tools/rotate-pdf.html",
  "tools/jpg-to-pdf.html", "tools/pdf-to-image.html", "tools/watermark-pdf.html",
  ...indexablePages.filter((relative) => relative.startsWith("guides/")),
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
const titles = new Map();
const descriptions = new Map();
for (const file of await htmlFiles(root)) {
  const html = await readFile(file, "utf8");
  if (!/<html[\s>]/i.test(html)) continue;
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const href of refs) {
    if (/^(?:https?:|#|data:|mailto:)/.test(href)) continue;
    const clean = href.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = path.resolve(path.dirname(file), clean);
    if (!await localTargetExists(target)) broken.push(path.relative(root, file) + " -> " + href);
  }
  const relative = path.relative(root, file);
  if (!indexablePages.includes(relative)) continue;
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (!title) broken.push(relative + " -> missing title");
  if (!description) broken.push(relative + " -> missing meta description");
  if (h1Count !== 1) broken.push(relative + " -> expected exactly one h1, found " + h1Count);
  if (title) addDuplicate(titles, title, relative);
  if (description) addDuplicate(descriptions, description, relative);
}
for (const [title, pages] of titles) if (pages.length > 1) broken.push("Duplicate title: " + title + " -> " + pages.join(", "));
for (const [description, pages] of descriptions) if (pages.length > 1) broken.push("Duplicate description -> " + pages.join(", "));
if (broken.length) {
  console.error("Broken local references:\n" + broken.join("\n"));
  process.exit(1);
}
console.log("Static checks passed: required files exist and local HTML references resolve.");

async function localTargetExists(target) {
  for (const candidate of [target, target + ".html", path.join(target, "index.html")]) {
    try { await access(candidate); return true; } catch { /* Try the next clean-URL form. */ }
  }
  return false;
}

function addDuplicate(map, value, relative) {
  const pages = map.get(value) || [];
  pages.push(relative);
  map.set(value, pages);
}
