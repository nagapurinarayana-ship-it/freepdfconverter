import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html", stableEntry: false },
  { name: "signature-resizer", page: "tools/signature-resizer.html", stableEntry: false },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html", stableEntry: true }
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
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const htmlByFile = new Map();

for (const file of htmlFiles) htmlByFile.set(file, await readFile(file, "utf8"));

const failures = [];

for (const tool of NEW_IMAGE_TOOLS) {
  const pageFile = path.join(dist, tool.page);
  const html = htmlByFile.get(pageFile);

  if (!html) {
    failures.push(`${tool.name}: page missing: ${tool.page}`);
    continue;
  }

  const stableEntry = `assets/js/tools/${tool.name}.entry.js`;
  const stableModule = `assets/js/tools/${tool.name}.tool.js`;
  const fingerprintedModulePattern = new RegExp(
    `^assets/js/tools/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`
  );
  const fingerprintedEntryPattern = new RegExp(
    `^assets/js/tools/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`
  );

  const modules = relativeFiles.filter((file) => fingerprintedModulePattern.test(file));
  if (modules.length !== 1) {
    failures.push(`${tool.name}: expected exactly one fingerprinted tool module, found ${modules.length}`);
  }

  if (relativeFiles.includes(stableModule)) {
    failures.push(`${tool.name}: stable tool module exists`);
  }

  if (tool.stableEntry) {
    if (!relativeFiles.includes(stableEntry)) {
      failures.push(`${tool.name}: stable entry bootstrap asset is missing`);
    }

    const stableEntryMatches = html.match(
      new RegExp(`<script[^>]*${tool.name}\\.entry\\.js[^>]*></script>`, "gi")
    ) || [];

    if (stableEntryMatches.length !== 1) {
      failures.push(`${tool.name}: page must contain exactly one stable entry script, found ${stableEntryMatches.length}`);
    } else if (!/type=["']module["']/i.test(stableEntryMatches[0])) {
      failures.push(`${tool.name}: stable entry must be a module script`);
    }

    const fingerprintedEntryMatches = html.match(
      new RegExp(`<script[^>]*${tool.name}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
    ) || [];

    if (fingerprintedEntryMatches.length) {
      failures.push(`${tool.name}: fingerprinted entry script leaked into HTML`);
    }

    if (relativeFiles.includes(`assets/js/tools/${tool.name}.entry.${"0".repeat(10)}.js`)) {
      failures.push(`${tool.name}: invalid fingerprinted entry sentinel leaked`);
    }

    try {
      const entrySource = await readFile(path.join(dist, stableEntry), "utf8");
      const imported = entrySource.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
      if (!new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(imported)) {
        failures.push(`${tool.name}: stable entry does not import its fingerprinted tool module (got "${imported || "none"}")`);
      } else if (!relativeFiles.includes(imported.replace(/^\//, ""))) {
        failures.push(`${tool.name}: stable entry imports missing module: ${imported}`);
      }
    } catch {
      failures.push(`${tool.name}: stable entry could not be read`);
    }
  } else {
    const entries = relativeFiles.filter((file) => fingerprintedEntryPattern.test(file));
    if (entries.length !== 1) {
      failures.push(`${tool.name}: expected exactly one fingerprinted entry module, found ${entries.length}`);
    }

    if (relativeFiles.includes(stableEntry)) {
      failures.push(`${tool.name}: stable entry asset exists`);
    }

    const entryMatches = html.match(
      new RegExp(`<script[^>]*${tool.name}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
    ) || [];

    if (entryMatches.length !== 1) {
      failures.push(`${tool.name}: page must contain exactly one fingerprinted entry script, found ${entryMatches.length}`);
    } else if (!/type=["']module["']/i.test(entryMatches[0])) {
      failures.push(`${tool.name}: fingerprinted entry must be a module script`);
    }

    if (entries.length === 1) {
      const entrySource = await readFile(path.join(dist, entries[0]), "utf8");
      const imported = entrySource.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
      if (!new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(imported)) {
        failures.push(`${tool.name}: entry does not import its fingerprinted tool module (got "${imported || "none"}")`);
      } else if (!relativeFiles.includes(imported.replace(/^\//, ""))) {
        failures.push(`${tool.name}: entry imports missing module: ${imported}`);
      }
    }
  }

  const directModuleMatches = html.match(
    new RegExp(`<script[^>]*${tool.name}\\.tool\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
  ) || [];

  if (directModuleMatches.length) {
    failures.push(`${tool.name}: page directly loads the tool module instead of the entry bootstrap`);
  }

  if (html.includes(stableModule)) {
    failures.push(`${tool.name}: page contains a stable tool-module URL`);
  }
}

if (failures.length) {
  throw new Error("New image-tools isolated verification failed:\n- " + failures.join("\n- "));
}

console.log(
  `New image-tools isolated verification passed: ${NEW_IMAGE_TOOLS.length} tools; Photo/Signature use fingerprinted entry -> fingerprinted module, Thumb uses stable entry -> fingerprinted module; no direct tool-module loads.`
);
