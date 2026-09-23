import { readFile, writeFile } from "node:fs/promises";

const path = "scripts/build.mjs";
let source = await readFile(path, "utf8");

const oldTargets = '  const applicationTargets = (await walk(assetRoot)).filter((file) => /\\.(?:css|js|mjs)$/i.test(file) && !file.startsWith(path.join(assetRoot, "vendor") + path.sep));';
const newTargets = `  const docjsRoot = path.join(assetRoot, "vendor", "docjs") + path.sep;
  const applicationTargets = (await walk(assetRoot)).filter((file) =>
    /\\.(?:css|js|mjs|wasm)$/i.test(file) && !file.startsWith(docjsRoot)
  );`;

if (source.includes(oldTargets)) source = source.replace(oldTargets, newTargets);

const oldPrecache = `    ...mappings.map((mapping) => "/" + mapping.newPath),\n    "/assets/vendor/docjs/index.js"\n  ];`;
const newPrecache = `    ...mappings.map((mapping) => "/" + mapping.newPath),\n    ...(await walk(path.join(dist, "assets/vendor/docjs")))\n      .map((file) => "/" + path.relative(dist, file).split(path.sep).join("/"))\n  ];`;

if (source.includes(oldPrecache)) source = source.replace(oldPrecache, newPrecache);

await writeFile(path, source, "utf8");
