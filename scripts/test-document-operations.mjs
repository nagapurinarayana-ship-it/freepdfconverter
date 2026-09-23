import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseMsDoc } from "@file-viewer/doc";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
assert.equal(packageJson.dependencies?.["@file-viewer/doc"], "3.1.2", "MS-DOC parser should stay on the current fixed release");

const wordSource = await readFile(path.join(root, "assets/js/word-to-pdf.js"), "utf8");
assert.match(wordSource, /getMsDocParser/);
assert.match(wordSource, /import\("\/assets\/vendor\/docjs\/index\.js"\)/);
assert.match(wordSource, /\.doc/);
assert.match(wordSource, /\.docx/);
assert.match(wordSource, /parseOoxml/);

const wordPage = await readFile(path.join(root, "tools/word-to-pdf.html"), "utf8");
assert.match(wordPage, /accept="[^"]*\.doc[^"]*\.docx/);
assert.match(wordPage, /Microsoft Word 97–2003/);
assert.match(wordPage, /modern Word documents/);

const pdfToWordSource = await readFile(path.join(root, "assets/js/pdf-to-word.js"), "utf8");
assert.match(pdfToWordSource, /\.docx/);
assert.match(pdfToWordSource, /buildDocx/);
assert.match(pdfToWordSource, /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
assert.match(pdfToWordSource, /mimeType:\s*DOCX_MIME/);
assert.match(pdfToWordSource, /new Blob\(\[blob\],\s*\{ type: DOCX_MIME \}\)/);

const docjsDist = path.join(root, "node_modules", "@file-viewer", "doc", "dist");
const docjsFiles = new Set();
async function collectDocjs(directory) {
  const entries = await (await import("node:fs/promises")).readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectDocjs(full);
    else if (/\.(?:js|mjs)$/i.test(entry.name)) docjsFiles.add(full);
  }
}
await collectDocjs(docjsDist);
assert.ok(docjsFiles.size > 0, "MS-DOC package should contain browser module files");

for (const file of docjsFiles) {
  const source = await readFile(file, "utf8");
  const relativeImports = [
    ...source.matchAll(/(?:import(?:\s+[^"'()]*?\s+from\s*|\s*\()|export\s+[^"'()]*?from\s*)["']([^"']+)["']/g)
  ]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("."));
  for (const specifier of relativeImports) {
    const resolved = path.resolve(path.dirname(file), specifier);
    const candidates = [
      resolved,
      resolved + ".js",
      resolved + ".mjs",
      path.join(resolved, "index.js"),
      path.join(resolved, "index.mjs")
    ];
    assert.ok(
      candidates.some((candidate) => docjsFiles.has(candidate)),
      "MS-DOC relative import must resolve inside the vendored module tree: " + path.relative(root, file) + " -> " + specifier
    );
  }
}

const fixtureUrl = "https://raw.githubusercontent.com/flyfish-dev/docjs/main/test/fixtures/github-34-wps-table.doc";
const response = await fetch(fixtureUrl);
if (!response.ok) throw new Error("Could not download MS-DOC fixture: HTTP " + response.status);

const bytes = await response.arrayBuffer();
assert.ok(bytes.byteLength > 1000, "Fixture should be a real Word 97-2003 document");

const parsed = parseMsDoc(bytes, { maxPictureBytes: 8 * 1024 * 1024 });
assert.equal(parsed.kind, "msdoc");
assert.ok(parsed.blocks.length > 0, "MS-DOC parser should produce document blocks");
assert.ok(parsed.meta?.fib?.ccpText > 0, "MS-DOC fixture should contain document text");

const flattened = parsed.blocks.flatMap((block) => {
  if (block.type === "paragraph") return [block.text];
  if (block.type === "table") {
    return block.rows.flatMap((row) =>
      row.cells.flatMap((cell) => cell.paragraphs.map((paragraph) => paragraph.text))
    );
  }
  return [];
}).join("\n");

assert.match(flattened, /./, "Parsed MS-DOC content should contain readable text");
console.log("Document format test passed: legacy .doc parser, modern .docx workflow, and DOCX MIME packaging checks passed.");
