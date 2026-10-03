import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { toolRegistry } from "./tool-registry.mjs";

const root = process.cwd();
const seenIds = new Set();
const seenPaths = new Set();

for (const tool of toolRegistry) {
  if (!tool.id || !tool.path || !tool.label) throw new Error("Tool registry entry is incomplete");
  if (seenIds.has(tool.id)) throw new Error("Duplicate tool id: " + tool.id);
  if (seenPaths.has(tool.path)) throw new Error("Duplicate tool path: " + tool.path);
  seenIds.add(tool.id);
  seenPaths.add(tool.path);

  const sourcePath = path.join(root, tool.path);
  await access(sourcePath);
  if (tool.guide) await access(path.join(root, tool.guide));

  const html = await readFile(sourcePath, "utf8");
  const declaredTool = (html.match(/<body[^>]*data-tool="([^"]+)"/i) || [])[1] || "";
  if (declaredTool && declaredTool !== tool.id) {
    throw new Error(tool.path + " declares data-tool=" + declaredTool + " but registry id is " + tool.id);
  }

  if (tool.id === "photo-compressor" || tool.id === "signature-resizer") {
    if (declaredTool !== tool.id) throw new Error(tool.path + " must declare its tool id");
    if (!html.includes('src="../assets/js/tool-runtime.js"')) {
      throw new Error(tool.path + " must use the shared tool runtime");
    }
    await access(path.join(root, "assets/js/tools", tool.id + ".tool.js"));
  }
}

console.log("Tool registry check passed: " + toolRegistry.length + " tools");
