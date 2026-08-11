"use strict";

importScripts("/assets/vendor/qpdf/qpdf.js");

var createQpdf = self.Module;
var enginePromise = null;

function getEngine() {
  if (!enginePromise) {
    enginePromise = createQpdf({
      locateFile: function () { return "/assets/vendor/qpdf/qpdf.wasm"; },
      noInitialRun: true
    });
  }
  return enginePromise;
}

function removeFile(qpdf, filename) {
  try { qpdf.FS.unlink(filename); } catch { /* The virtual file may not exist. */ }
}

self.onmessage = async function (event) {
  var data = event.data || {};
  var requestId = String(data.id || "unlock").replace(/[^a-z0-9_-]/gi, "").slice(0, 80) || "unlock";
  var inputPath = "/" + requestId + "-input.pdf";
  var outputPath = "/" + requestId + "-output.pdf";
  var password = typeof data.password === "string" ? data.password : "";
  var qpdf;

  try {
    self.postMessage({ type: "progress", value: 42 });
    qpdf = await getEngine();
    self.postMessage({ type: "progress", value: 58 });

    var inputBytes = new Uint8Array(data.bytes);
    if (!inputBytes.byteLength) throw new Error("empty-input");
    qpdf.FS.writeFile(inputPath, inputBytes);
    inputBytes = null;

    var encryptionStatus = qpdf.callMain(["--password=" + password, "--is-encrypted", inputPath]);
    var wasEncrypted = encryptionStatus === 0;
    self.postMessage({ type: "progress", value: 70 });

    var result = qpdf.callMain([
      "--warning-exit-0",
      "--password=" + password,
      "--decrypt",
      inputPath,
      outputPath
    ]);
    if (result !== 0) throw new Error("unlock-failed");

    var output = qpdf.FS.readFile(outputPath);
    if (output.byteLength < 5 || String.fromCharCode.apply(null, output.subarray(0, 5)) !== "%PDF-") {
      throw new Error("invalid-output");
    }

    var copy = output.slice().buffer;
    self.postMessage({ type: "progress", value: 92 });
    self.postMessage({ type: "result", bytes: copy, wasEncrypted: wasEncrypted }, [copy]);
  } catch (error) {
    self.postMessage({
      type: "error",
      code: error && error.message === "unlock-failed" ? "unlock-failed" : "processing-failed"
    });
  } finally {
    password = "";
    if (qpdf) {
      removeFile(qpdf, inputPath);
      removeFile(qpdf, outputPath);
    }
  }
};
