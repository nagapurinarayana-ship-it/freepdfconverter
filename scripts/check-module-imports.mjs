import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const failures = [];

for (const file of await walk(path.join(dist, "assets", "js"))) {
  if (!/\.(?:js|mjs)$/i.test(file)) continue;

  const source = await readFile(file, "utf8");
  const specifiers = [];

  for (const match of source.matchAll(/\bfrom\s*["']([^"']+)["']/g)) specifiers.push(match[1]);
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) specifiers.push(match[1]);

  for (const specifier of specifiers) {
    if (!(specifier.startsWith(".") || specifier.startsWith("/assets/js/"))) continue;

    const target = specifier.startsWith("/")
      ? path.join(dist, specifier.slice(1))
      : path.resolve(path.dirname(file), specifier);

    try {
      await access(target);
    } catch {
      failures.push(path.relative(dist, file) + " -> missing module " + specifier);
    }
  }
}

if (failures.length) {
  console.error("Module import validation failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}

console.log("Module import validation passed.");

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}
