import assert from "node:assert/strict";
import {
  CUSTOM_TARGET_KB,
  TARGET_CANDIDATES,
  TARGET_PRESETS,
  chooseBestCandidate,
  clampCustomTargetKb,
  isTargetReached,
  reductionPercent,
  targetBytesFromSelection
} from "../assets/js/core/pdf-target-policy.js";

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

console.log("PDF target policy tests passed: presets, bounds, target detection, reduction math and candidate selection.");
