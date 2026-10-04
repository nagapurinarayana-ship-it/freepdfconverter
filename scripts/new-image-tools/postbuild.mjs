import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

// ONLY these five image tools use the new isolated loader strategy.
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

  // Never allow the fingerprinted implementation module to be executed directly
  // by HTML. The entry module owns the dynamic import of the fingerprinted tool.
  const directModule = new RegExp(
    `<script\\s+type=["']module["']\\s+src=["'][^"']*/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js["']\\s*></script>`,
    "gi"
  );
  const directMatches = html.match(directModule);
  if (directMatches?.length) {
    removedDirectModules += directMatches.length;
    html = html.replace(directModule, "");
  }

  // New strategy: keep the fingerprinted entry bootstrap as a module so the
  // browser receives a fresh URL whenever the build changes.
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
  if (!new RegExp(`/${tool.name}\\.tool\\.[a-f0-9]{10}\\.js$`).test(moduleImport)) {
    throw new Error(
      `${tool.name}: fingerprinted entry does not import its fingerprinted tool module (got ${moduleImport || "none"})`
    );
  }

  if (html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable tool-module URL leaked into generated HTML`);
  }

  verifiedEntryScripts += 1;
  await writeFile(pagePath, html, "utf8");
}

console.log(
  `New image-tools isolated loader: verified ${verifiedEntryScripts} new-tool entry modules; removed ${removedDirectModules} direct tool-module scripts. Existing working tools were not modified.`
);
