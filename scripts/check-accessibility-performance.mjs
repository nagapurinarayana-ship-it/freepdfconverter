import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { indexablePages } from "./site-config.mjs";

const dist = path.join(process.cwd(), "dist");
const failures = [];

for (const relative of indexablePages) {
  const file = path.join(dist, relative);
  const html = await readFile(file, "utf8");

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\balt\s*=\s*["'][^"']*["']/i.test(tag)) {
      failures.push(relative + " -> image is missing alt text");
    }
  }

  for (const match of html.matchAll(/<button\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\btype\s*=\s*["'](?:button|submit|reset)["']/i.test(tag)) {
      failures.push(relative + " -> button is missing an explicit type");
    }
  }

  for (const match of html.matchAll(/<iframe\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\btitle\s*=\s*["'][^"']+["']/i.test(tag)) {
      failures.push(relative + " -> iframe is missing an accessible title");
    }
  }

  const head = html.match(/<head>[\s\S]*?<\/head>/i)?.[0] || "";
  for (const match of head.matchAll(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>/gi)) {
    const tag = match[0];
    const isModule = /\btype\s*=\s*["']module["']/i.test(tag);
    const isDeferred = /\bdefer\b/i.test(tag);
    const isAsync = /\basync\b/i.test(tag);
    if (!isModule && !isDeferred && !isAsync) {
      failures.push(relative + " -> render-blocking script in head: " + tag.slice(0, 180));
    }
  }

  if (/\bassets\/css\/styles\.css(?:["'?]|$)/.test(html)) {
    failures.push(relative + " -> unfingerprinted stylesheet reference remains");
  }
  if (/\bassets\/js\/common\.js(?:["'?]|$)/.test(html)) {
    failures.push(relative + " -> unfingerprinted common.js reference remains");
  }
}

const cssFiles = await readdir(path.join(dist, "assets/css"));
const jsFiles = await readdir(path.join(dist, "assets/js"));
if (!cssFiles.some(file => /^styles\.[a-f0-9]{10}\.css$/.test(file))) failures.push("build -> fingerprinted styles.css asset missing");
if (!jsFiles.some(file => /^common\.[a-f0-9]{10}\.js$/.test(file))) failures.push("build -> fingerprinted common.js asset missing");

if (failures.length) {
  console.error("Accessibility/performance quality checks failed:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Accessibility/performance quality checks passed for " + indexablePages.length + " indexable pages.");