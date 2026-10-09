import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [serviceWorker, headers] = await Promise.all([
  readFile(new URL("../service-worker.js", import.meta.url), "utf8"),
  readFile(new URL("../_headers", import.meta.url), "utf8")
]);

assert.match(serviceWorker, /fetch\(request,\s*\{\s*cache:\s*"no-cache"\s*\}\)/,
  "navigation and code assets must revalidate against the network");
assert.match(serviceWorker, /const isCodeAsset\s*=([\s\S]*?)if \(isCodeAsset\)\s*\{/,
  "JavaScript, CSS and vendor code must use the network-first path");
assert.match(serviceWorker, /if \(isCodeAsset\)\s*\{[\s\S]*?caches\.open\(RUNTIME_CACHE\)/,
  "successful network responses must refresh the runtime cache");
assert.match(serviceWorker, /\.catch\(function \(\) \{\s*return caches\.match\(request\)/,
  "cached code must remain available as an offline fallback");

for (const pattern of [
  /\/assets\/js\/\*\s*\n\s*Cache-Control: public, max-age=0, must-revalidate/,
  /\/assets\/css\/\*\s*\n\s*Cache-Control: public, max-age=0, must-revalidate/,
  /\/assets\/vendor\/\*\s*\n\s*Cache-Control: public, max-age=0, must-revalidate/
]) {
  assert.match(headers, pattern, "executable/style assets must revalidate instead of remaining immutable for a year");
}

assert.match(headers, /\/service-worker\.js\s*\n\s*Cache-Control: no-cache, no-store, must-revalidate/,
  "the service worker script itself must always be rechecked");

console.log("Cache policy tests passed: navigation and code revalidate each load, and offline cache fallback remains enabled.");
