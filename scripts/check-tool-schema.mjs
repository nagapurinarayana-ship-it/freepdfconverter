import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist", "tools");
const files = (await readdir(dist, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name);

const failures = [];

for (const name of files) {
  const html = await readFile(path.join(dist, name), "utf8");
  const blocks = [...html.matchAll(/<script type="application\/ld\+json" data-tool-schema>([\s\S]*?)<\/script>/gi)];
  if (blocks.length !== 1) {
    failures.push(`${name} -> expected exactly one tool schema block, found ${blocks.length}`);
    continue;
  }
  try {
    const data = JSON.parse(blocks[0][1]);
    const graph = Array.isArray(data?.["@graph"]) ? data["@graph"] : [];
    const webpage = graph.find((item) => item?.["@type"] === "WebPage");
    const software = graph.find((item) => item?.["@type"] === "SoftwareApplication");
    if (!webpage) failures.push(`${name} -> missing WebPage schema`);
    if (!software) failures.push(`${name} -> missing SoftwareApplication schema`);
    if (software && software.isAccessibleForFree !== true) failures.push(`${name} -> SoftwareApplication isAccessibleForFree must be true`);
    if (software && software.offers?.price !== "0") failures.push(`${name} -> SoftwareApplication offer must be free`);
    if (software && software.operatingSystem !== "Web browser") failures.push(`${name} -> unexpected operating system`);

    const allBlocks = [...html.matchAll(/<script type="application\/ld\+json"(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
    const applicationSchemas = [];
    for (const block of allBlocks) {
      const parsed = JSON.parse(block[1]);
      const items = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [parsed];
      applicationSchemas.push(...items.filter((item) => item?.["@type"] === "SoftwareApplication" || item?.["@type"] === "WebApplication"));
    }
    if (applicationSchemas.length !== 1) failures.push(`${name} -> expected exactly one application schema across the page, found ${applicationSchemas.length}`);
  } catch {
    failures.push(`${name} -> invalid tool JSON-LD`);
  }
}

if (failures.length) {
  console.error("Tool structured-data checks failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`Tool structured-data checks passed for ${files.length} pages.`);
