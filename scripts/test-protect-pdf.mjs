import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const P = require(path.join(root, "assets/vendor/pdf-lib/pdf-lib.min.js"));
const createQpdf = require(path.join(root, "assets/vendor/qpdf/qpdf.js"));

assert.ok(P && P.PDFDocument, "pdf-lib fixture dependency should be available");
assert.equal(typeof createQpdf, "function", "qpdf-wasm should expose its module factory");

const sample = await P.PDFDocument.create();
sample.setTitle("Protect test fixture");
sample.addPage([612, 792]);
const plainBytes = await sample.save({ useObjectStreams: true });

let qpdf;
qpdf = await createQpdf({
  locateFile: (filename) => path.join(root, "assets/vendor/qpdf", filename),
  noInitialRun: true
});

const remove = (filename) => { try { qpdf.FS.unlink(filename); } catch {} };
qpdf.FS.writeFile("/plain.pdf", plainBytes);

assert.equal(qpdf.callMain([
  "--encrypt",
  "--user-password=correct-horse-42!",
  "--owner-password=owner-random-98#",
  "--bits=256",
  "--print=none",
  "--extract=n",
  "--modify=none",
  "--annotate=n",
  "--form=n",
  "--assemble=n",
  "--modify-other=n",
  "--",
  "/plain.pdf",
  "/protected.pdf"
]), 0);

assert.equal(qpdf.callMain(["--password=correct-horse-42!", "--is-encrypted", "/protected.pdf"]), 0);
assert.equal(qpdf.callMain(["--password=wrong-password", "--decrypt", "/protected.pdf", "/wrong.pdf"]), 2);
assert.equal(qpdf.callMain(["--password=correct-horse-42!", "--decrypt", "/protected.pdf", "/decrypted.pdf"]), 0);
assert.equal(qpdf.callMain(["--is-encrypted", "/decrypted.pdf"]), 2);

const decrypted = await P.PDFDocument.load(qpdf.FS.readFile("/decrypted.pdf"), { updateMetadata: false });
assert.equal(decrypted.getPageCount(), 1);
assert.equal(decrypted.getTitle(), "Protect test fixture");

["/plain.pdf", "/protected.pdf", "/wrong.pdf", "/decrypted.pdf"].forEach(remove);

console.log("Protect PDF tests passed: 256-bit encryption, wrong-password rejection and local decryption round-trip.");
process.exitCode = 0;