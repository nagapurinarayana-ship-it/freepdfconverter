import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const P = require(path.join(root, "assets/vendor/pdf-lib/pdf-lib.min.js"));
const createQpdf = require(path.join(root, "assets/vendor/qpdf/qpdf.js"));

assert.ok(P && P.PDFDocument, "self-hosted pdf-lib should be available for fixture validation");
assert.equal(typeof createQpdf, "function", "self-hosted qpdf-wasm should expose its module factory");

const sample = await P.PDFDocument.create();
sample.setTitle("Unlock test fixture");
sample.addPage([612, 792]);
sample.addPage([420, 595]);
const plainBytes = await sample.save({ useObjectStreams: true });

const qpdfMessages = [];
const originalConsoleError = console.error;
console.error = (...values) => qpdfMessages.push(values.join(" "));
let qpdf;
try {
  qpdf = await createQpdf({
    locateFile: (filename) => path.join(root, "assets/vendor/qpdf", filename),
    noInitialRun: true
  });
} finally {
  console.error = originalConsoleError;
}

const exists = (filename) => {
  try { qpdf.FS.stat(filename); return true; } catch { return false; }
};
const remove = (filename) => {
  try { qpdf.FS.unlink(filename); } catch { /* Test cleanup only. */ }
};

qpdf.FS.writeFile("/plain.pdf", plainBytes);

assert.equal(qpdf.callMain(["--encrypt", "correct-horse-42!", "owner-secret", "256", "--", "/plain.pdf", "/locked.pdf"]), 0);
assert.equal(qpdf.callMain(["--password=correct-horse-42!", "--is-encrypted", "/locked.pdf"]), 0);
assert.equal(qpdf.callMain(["--password=wrong-password", "--decrypt", "/locked.pdf", "/wrong.pdf"]), 2);
assert.equal(exists("/wrong.pdf"), false, "a wrong password must not produce an output file");

assert.equal(qpdf.callMain(["--password=correct-horse-42!", "--decrypt", "/locked.pdf", "/unlocked.pdf"]), 0);
assert.equal(qpdf.callMain(["--is-encrypted", "/unlocked.pdf"]), 2, "the unlocked output should have no encryption dictionary");
const unlocked = await P.PDFDocument.load(qpdf.FS.readFile("/unlocked.pdf"), { updateMetadata: false });
assert.equal(unlocked.getPageCount(), 2);
assert.equal(unlocked.getTitle(), "Unlock test fixture");

assert.equal(qpdf.callMain(["--encrypt", "", "permissions-only", "256", "--", "/plain.pdf", "/restricted.pdf"]), 0);
assert.equal(qpdf.callMain(["--is-encrypted", "/restricted.pdf"]), 0);
assert.equal(qpdf.callMain(["--password=", "--decrypt", "/restricted.pdf", "/restriction-removed.pdf"]), 0);
assert.equal(qpdf.callMain(["--is-encrypted", "/restriction-removed.pdf"]), 2);
assert.equal((await P.PDFDocument.load(qpdf.FS.readFile("/restriction-removed.pdf"))).getPageCount(), 2);

["/plain.pdf", "/locked.pdf", "/unlocked.pdf", "/restricted.pdf", "/restriction-removed.pdf"].forEach(remove);
assert.ok(qpdfMessages.some((message) => /invalid password/i.test(message)), "wrong-password behavior should be exercised");

console.log("Unlock PDF tests passed: known password, wrong password and blank-user-password restrictions.");
// Emscripten mirrors the last qpdf CLI status onto Node's process.exitCode.
// The final --is-encrypted check intentionally returns 2 for an unlocked file.
process.exitCode = 0;
