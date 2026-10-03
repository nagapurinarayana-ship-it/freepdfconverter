import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CUSTOM_TARGET_KB,
  TARGET_CANDIDATES,
  TARGET_PRESETS,
  chooseBestCandidate,
  clampCustomTargetKb,
  isTargetReached,
  reductionPercent,
  targetBytesFromSelection
} from "../assets/js/core/pdf-target-policy.mjs";

assert.deepEqual(TARGET_PRESETS.map((item) => item.bytes), [102400, 204800, 512000, 1048576, 2097152]);
assert.ok(TARGET_CANDIDATES.length >= 10, "target compression must have a bounded quality ladder");
assert.equal(clampCustomTargetKb("not-a-number"), 200);
assert.equal(clampCustomTargetKb(1), CUSTOM_TARGET_KB.min);
assert.equal(clampCustomTargetKb(999999), CUSTOM_TARGET_KB.max);
assert.equal(targetBytesFromSelection("204800", 200), 204800);
assert.equal(targetBytesFromSelection("custom", 150), 153600);
assert.equal(isTargetReached(200000, 204800), true);
assert.equal(isTargetReached(204801, 204800), false);
assert.equal(reductionPercent(1000, 250), 75);
assert.equal(reductionPercent(1000, 1200), 0);
assert.equal(chooseBestCandidate([{ size: 900 }, { size: 200 }, { size: 500 }]).size, 200);
assert.equal(chooseBestCandidate([]), null);

const root = process.cwd();
const html = await readFile(`${root}/tools/compress-pdf.html`, "utf8");
const controller = await readFile(`${root}/assets/js/compress-pdf.js`, "utf8");
const policy = await readFile(`${root}/assets/js/core/pdf-target-policy.mjs`, "utf8");

for (const value of ["100 KB", "200 KB", "500 KB", "1 MB", "2 MB", "Custom"]) {
  assert.match(html, new RegExp(value.replace(" ", "\\s*")), `missing target preset: ${value}`);
}
assert.match(html, /accept="application\/pdf,\.pdf"/);
assert.match(html, /browser-local processing/);
assert.match(controller, /pdf-target-policy\.mjs/);
assert.match(controller, /compress-pdf-worker\.js/);
assert.match(controller, /pdf\.min\.mjs/);
assert.match(controller, /downloadBlob/);
assert.match(controller, /encrypted-pdf/);
assert.match(controller, /targetReached/);
assert.match(policy, /TARGET_CANDIDATES/);
assert.match(policy, /CUSTOM_TARGET_KB/);

console.log("PDF target policy tests passed: deterministic policy, UI contract, browser engines, download path and failure handling.");
