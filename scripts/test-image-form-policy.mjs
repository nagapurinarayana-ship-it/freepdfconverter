import assert from "node:assert/strict";
import {
  CUSTOM_TARGET_KB,
  PHOTO_TARGET_PRESETS,
  QUALITY_LADDER,
  WIDTH_LADDER,
  clampPixels,
  clampTargetKb,
  isTargetReached,
  pixelsFromPhysical,
  reductionPercent,
  resolveDimensions,
  targetBytesFromSelection
} from "../assets/js/core/image-form-policy.js";

assert.deepEqual(
  PHOTO_TARGET_PRESETS.map((item) => item.bytes),
  [10240, 20480, 51200, 102400, 204800, 512000, 1048576, 2097152]
);
assert.equal(QUALITY_LADDER.length >= 10, true);
assert.equal(WIDTH_LADDER.length >= 6, true);
assert.equal(clampTargetKb("invalid"), 100);
assert.equal(clampTargetKb(1), CUSTOM_TARGET_KB.min);
assert.equal(clampTargetKb(60000), CUSTOM_TARGET_KB.max);
assert.equal(targetBytesFromSelection("200", 100), 200 * 1024);
assert.equal(targetBytesFromSelection("custom", 25), 25 * 1024);
assert.equal(isTargetReached(100000, 100000), true);
assert.equal(isTargetReached(100001, 100000), false);
assert.equal(reductionPercent(1000, 250), 75);
assert.equal(reductionPercent(1000, 1200), 0);
assert.equal(pixelsFromPhysical(35, "mm", 300), 413);
assert.equal(pixelsFromPhysical(3.5, "cm", 300), 413);
assert.equal(clampPixels(9000, 1600), 6000);
assert.deepEqual(
  resolveDimensions({
    mode: "max-width",
    width: 800,
    height: 1200,
    unit: "px",
    dpi: 96,
    sourceWidth: 1600,
    sourceHeight: 1200,
    keepAspect: true
  }),
  { width: 800, height: 600 }
);
assert.deepEqual(
  resolveDimensions({
    mode: "original",
    width: 35,
    height: 45,
    unit: "mm",
    dpi: 300,
    sourceWidth: 1200,
    sourceHeight: 800,
    keepAspect: true
  }),
  { width: 1200, height: 800 }
);

console.log("Image form policy tests passed: target presets, bounds, physical units, dimension resolution and compression math.");
