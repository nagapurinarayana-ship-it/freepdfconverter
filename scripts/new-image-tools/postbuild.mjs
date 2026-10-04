import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// ALL FIVE image tools in the new-tools set use the new isolated strategy.
// Existing working tools are intentionally excluded.
const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

let verifiedEntryScripts = 0;
let removedDirectModules = 0;

for (const tool of NEW_IMAGE_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");

  const directModule = new RegExp(
    `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
    "gi"
  );
  const directMatches = html.match(directModule);
  if (directMatches?.length) {
    removedDirectModules += directMatches.length;
    html = html.replace(directModule, "");
  }

  // New strategy: fingerprinted module entry stays a module, so every build gets
  // a new bootstrap URL and the entry dynamically imports the fingerprinted tool module.
  const entryPattern = new RegExp(
    `<script\\b(?=[^>]*\\btype=["']module["'])(?=[^>]*\\bsrc=["'][^"']*/${tool.name}\\.entry\\.[a-f0-9]{10}\\.js["'])[^>]*></script>`,
    "gi"
  );
  const entryMatches = [...html.matchAll(entryPattern)];
  if (entryMatches.length !== 1) {
    throw new Error(
      `${tool.name}: expected exactly one fingerprinted entry module script in ${tool.page}, found ${entryMatches.length}`
    );
  }

  const entrySrc = entryMatches[0][0].match(/src=["']([^"']+)["']/i)?.[1] || "";
  const normalizedSrc = entrySrc.startsWith("/") ? entrySrc.slice(1) : entrySrc.replace(/^\.\//, "");
  const entryFile = path.join(dist, normalizedSrc);
  const entrySource = await readFile(entryFile, "utf8");

  const moduleImport = entrySource.match(/import\(["']([^"']+)["']\)/)?.[1] || "";
  const expectedModule = new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`);
  if (!expectedModule.test(moduleImport)) {
    throw new Error(
      `${tool.name}: fingerprinted entry does not import its fingerprinted tool module (got ${moduleImport || "none"})`
    );
  }

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into generated HTML`);
  }
  if (html.includes(`/assets/js/tools/${tool.name}.entry.js`)) {
    throw new Error(`${tool.name}: stable entry URL leaked into generated HTML`);
  }

  verifiedEntryScripts += 1;
  await writeFile(pagePath, html, "utf8");
}

console.log(
  `New image-tools isolated loader: verified ${verifiedEntryScripts} fingerprinted entry modules; removed ${removedDirectModules} direct tool modules. All five new image tools are isolated; existing working tools were excluded.`
);
