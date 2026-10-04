import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// New image tools only. Existing working tools are intentionally excluded.
const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

// Sign PDF is also new, but it has its own PDF-specific implementation rather than the image-tool bootstrap.
const NEW_PDF_TOOLS = [
  { name: "sign-pdf", page: "tools/sign-pdf.html", script: "assets/js/sign-pdf.js" }
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
for (const file of htmlFiles) allText.set(file, await readFile(file, "utf8"));

const failures = [];
const relativeFiles = files.map((file) => path.relative(dist, file).split(path.sep).join("/"));

for (const tool of NEW_IMAGE_TOOLS) {
  const entryPattern = new RegExp(String.raw`^assets/js/tools/${tool.name}\.entry\.[a-f0-9]{10}\.js$`);
  const modulePattern = new RegExp(String.raw`^assets/js/tools/${tool.name}\.tool\.[a-f0-9]{10}\.js$`);
  const stableEntry = `assets/js/tools/${tool.name}.entry.js`;
  const stableModule = `assets/js/tools/${tool.name}.tool.js`;

  if (relativeFiles.includes(stableModule)) {
    failures.push(`${tool.name}: stable tool asset exists`);
  }

  const pageFile = path.join(dist, tool.page);
  const html = allText.get(pageFile);
  if (!html) {
    failures.push(`${tool.name}: page missing: ${tool.page}`);
    continue;
  }

  if (tool.name === "thumb-impression-resizer") {
    if (!relativeFiles.includes(stableEntry)) {
      failures.push(`${tool.name}: stable entry bootstrap asset is missing`);
    }

    const stableEntryFile = path.join(dist, stableEntry);
    try {
      const entrySource = await readFile(stableEntryFile, "utf8");
      const importMatch = entrySource.match(/import\(["']([^"']+)["']\)/);
      const imported = importMatch?.[1] || "";
      const expectedModulePattern = /\/thumb-impression-resizer\.tool\.[a-f0-9]{10}\.js$/;
      if (!expectedModulePattern.test(imported)) {
        failures.push(`${tool.name}: stable entry does not dynamically import a fingerprinted tool module (got "${imported || "none"}")`);
      } else if (!relativeFiles.includes(imported.replace(/^\//, ""))) {
        failures.push(`${tool.name}: stable entry imports missing module: ${imported}`);
      }
    } catch {
      failures.push(`${tool.name}: stable entry bootstrap could not be read`);
    }

    const stableEntryMatches = html.match(
      new RegExp(`<script[^>]*${tool.name}\\.entry\\.js[^>]*></script>`, "gi")
    ) || [];
    if (stableEntryMatches.length !== 1) {
      failures.push(`${tool.name}: page must contain exactly one stable entry script, found ${stableEntryMatches.length}`);
    } else if (!/type=["']module["']/i.test(stableEntryMatches[0])) {
      failures.push(`${tool.name}: stable entry must remain a module script`);
    }

    const fingerprintedEntryMatches = html.match(
      new RegExp(`<script[^>]*${tool.name}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
    ) || [];
    if (fingerprintedEntryMatches.length) {
      failures.push(`${tool.name}: fingerprinted entry leaked into HTML after stable bootstrap conversion`);
    }
  } else {
    const entryPattern = new RegExp(
      `^assets/js/tools/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js$`
    );
    const modulePattern = new RegExp(
      `^assets/js/tools/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`
    );
    const entries = relativeFiles.filter((file) => entryPattern.test(file));
    const modules = relativeFiles.filter((file) => modulePattern.test(file));

    if (entries.length !== 1) failures.push(`${tool.name}: expected one fingerprinted entry asset, found ${entries.length}`);
    if (modules.length !== 1) failures.push(`${tool.name}: expected one fingerprinted tool asset, found ${modules.length}`);
    if (relativeFiles.includes(stableEntry)) failures.push(`${tool.name}: stable entry asset exists`);

    const entryHtmlMatches = html.match(
      new RegExp(`<script[^>]*${tool.name}\\.entry\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
    ) || [];
    if (entryHtmlMatches.length !== 1) {
      failures.push(`${tool.name}: page must contain exactly one fingerprinted entry script, found ${entryHtmlMatches.length}`);
    } else if (!/type=["']module["']/i.test(entryHtmlMatches[0])) {
      failures.push(`${tool.name}: fingerprinted entry must remain a module script`);
    }

    if (entries.length === 1 && modules.length === 1) {
      const entryFile = path.join(dist, entries[0]);
      const entrySource = await readFile(entryFile, "utf8");
      const importMatch = entrySource.match(/import\(["']([^"']+)["']\)/);
      const imported = importMatch?.[1] || "";
      const expectedModulePattern = new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`);
      if (!expectedModulePattern.test(imported)) {
        failures.push(`${tool.name}: entry does not dynamically import a fingerprinted tool module (got "${imported || "none"}")`);
      } else if (!relativeFiles.includes(imported.replace(/^\//, ""))) {
        failures.push(`${tool.name}: dynamically imported module is missing: ${imported}`);
      }
    }
  }

  const directHtmlMatches = html.match(
    new RegExp(`<script[^>]*${tool.name}\\.tool\\.[a-f0-9]{10}\\.js[^>]*></script>`, "gi")
  ) || [];
  if (directHtmlMatches.length) {
    failures.push(`${tool.name}: page directly loads the tool module`);
  }

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`) ||
      (tool.name !== "thumb-impression-resizer" && html.includes(`/assets/js/tools/${tool.name}.entry.js`))) {
    failures.push(`${tool.name}: page contains an unexpected stable image-tool URL`);
  }


