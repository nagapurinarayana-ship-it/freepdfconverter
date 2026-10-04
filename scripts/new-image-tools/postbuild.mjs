import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");

const NEW_IMAGE_TOOLS = [
  { name: "photo-compressor", page: "tools/photo-compressor.html" },
  { name: "signature-resizer", page: "tools/signature-resizer.html" },
  { name: "passport-id-photo-maker", page: "tools/passport-id-photo-maker.html" },
  { name: "thumb-impression-resizer", page: "tools/thumb-impression-resizer.html" },
  { name: "handwritten-declaration-resizer", page: "tools/handwritten-declaration-resizer.html" }
];

const fingerprint = "[a-f0-9]{10}";
let normalizedEntryScripts = 0;
let removedDirectModules = 0;

for (const tool of NEW_IMAGE_TOOLS) {
  const pagePath = path.join(dist, tool.page);
  let html = await readFile(pagePath, "utf8");

  const directModule = new RegExp(
    String.raw`<script\s+type=["']module["']\s+src=["'][^"']*/${tool.name}\.tool\.${fingerprint}\.js["']\s*></script>`,
    "gi"
  );

  const directMatches = html.match(directModule);
  if (directMatches?.length) {
    removedDirectModules += directMatches.length;
    html = html.replace(directModule, "");
  }

  const entryPattern = new RegExp(
    String.raw`<script\s+(?:type=["']module["']\s+)?src=["']([^"']*/${tool.name}\.entry\.${fingerprint}\.js)["'](?:\s+defer)?\s*></script>`,
    "gi"
  );

  const entryMatches = [...html.matchAll(entryPattern)];

  if (entryMatches.length !== 1) {
    throw new Error(
      `${tool.name}: expected exactly one fingerprinted entry script in ${tool.page}, found ${entryMatches.length}`
    );
  }

  const entrySrc = entryMatches[0][1];
  html = html.replace(entryPattern, `<script src="${entrySrc}" defer></script>`);
  normalizedEntryScripts += 1;

  if (html.includes(`/assets/js/tools/${tool.name}.entry.js`) ||
      html.includes(`/assets/js/tools/${tool.name}.tool.js`)) {
    throw new Error(`${tool.name}: stable image-tool URL leaked into generated HTML`);
  }

  await writeFile(pagePath, html, "utf8");
}

console.log(
  `New image-tools isolated loader: normalized ${normalizedEntryScripts} fingerprinted entry scripts; removed ${removedDirectModules} direct tool-module scripts. Existing tool loaders were not modified.`
);
