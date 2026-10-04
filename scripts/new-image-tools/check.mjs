import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" }
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
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const allText = new Map();

for (const file of htmlFiles) {
  allText.set(file, await readFile(file, "utf8"));
}

const failures = [];

for (const tool of NEW_IMAGE_TOOLS) {
  const entryPattern = new RegExp(
    String.raw`^assets/js/tools/${tool.name}\.entry\.[a-f0-9]{10}\.js$`
  );
  const modulePattern = new RegExp(
    String.raw`^assets/js/tools/${tool.name}\.tool\.[a-f0-9]{10}\.js$`
  );

  const relativeFiles = files.map((file) =>
    path.relative(dist, file).split(path.sep).join("/")
  );

  const entries = relativeFiles.filter((file) => entryPattern.test(file));
  const modules = relativeFiles.filter((file) => modulePattern.test(file));

  if (entries.length !== 1) failures.push(`${tool.name}: expected one fingerprinted entry asset, found ${entries.length}`);
  if (modules.length !== 1) failures.push(`${tool.name}: expected one fingerprinted tool asset, found ${modules.length}`);

  if (relativeFiles.includes(`assets/js/tools/${tool.name}.entry.js`)) {
    failures.push(`${tool.name}: stable entry asset exists`);
  }

  if (relativeFiles.includes(`assets/js/tools/${tool.name}.tool.js`)) {
    failures.push(`${tool.name}: stable tool asset exists`);
  }

  const pageFile = path.join(dist, tool.page);
  const html = allText.get(pageFile);
  if (!html) {
    failures.push(`${tool.name}: page missing: ${tool.page}`);
    continue;
  }

  const entryHtmlMatches = html.match(
    new RegExp(String.raw`<script\s+src=["'][^"']*/${tool.name}\.entry\.[a-f0-9]{10}\.js["']\s+defer></script>`, "gi")
  ) || [];

  if (entryHtmlMatches.length !== 1) {
    failures.push(`${tool.name}: page must contain exactly one deferred fingerprinted entry script, found ${entryHtmlMatches.length}`);
  }

  const directHtmlMatches = html.match(
    new RegExp(String.raw`<script\s+type=["']module["']\s+src=["'][^"']*/${tool.name}\.tool\.[a-f0-9]{10}\.js["']\s*></script>`, "gi")
  ) || [];

  if (directHtmlMatches.length) {
    failures.push(`${tool.name}: page directly loads the tool module`);
  }

  if (html.includes(`/assets/js/tools/${tool.name}.entry.js`) ||
      html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    failures.push(`${tool.name}: page contains a stable image-tool URL`);
  }

  if (entries.length === 1 && modules.length === 1) {
    const entryFile = path.join(dist, entries[0]);
    const entrySource = await readFile(entryFile, "utf8");
    const importMatch = entrySource.match(/import\(["']([^"']+)["']\)/);
    const imported = importMatch?.[1] || "";
    const expectedModuleName = `${tool.name}.tool.`;
    const expectedModulePattern = new RegExp(
      String.raw`/${expectedModuleName}[a-f0-9]{10}\.js$`
    );

    if (!expectedModulePattern.test(imported)) {
      failures.push(`${tool.name}: entry does not dynamically import a fingerprinted tool module (got "${imported || "none"}")`);
    } else {
      const importedPath = imported.replace(/^\//, "");
      if (!relativeFiles.includes(importedPath)) {
        failures.push(`${tool.name}: dynamically imported module is missing: ${imported}`);
      }
    }
  }

  for (const [file, text] of allText) {
    const directGlobal = new RegExp(
      String.raw`<script\s+type=["']module["']\s+src=["'][^"']*/${tool.name}\.tool\.[a-f0-9]{10}\.js["']\s*></script>`,
      "i"
    );
    if (directGlobal.test(text)) {
      failures.push(`${tool.name}: direct module script leaked into ${path.relative(dist, file)}`);
    }
  }
}

if (failures.length) {
  throw new Error("New image-tools isolated verification failed:\n- " + failures.join("\n- "));
}

console.log(
  `New image-tools isolated verification passed: ${NEW_IMAGE_TOOLS.length} tools, fingerprinted entry -> fingerprinted module, no stable URLs, no direct module script tags.`
);
