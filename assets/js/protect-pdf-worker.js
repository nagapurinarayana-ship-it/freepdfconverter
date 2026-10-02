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
  try { qpdf.FS.unlink(filename); } catch {}
}

self.onmessage = async function (event) {
  var data = event.data || {};
  var requestId = String(data.id || "protect").replace(/[^a-z0-9_-]/gi, "").slice(0, 80) || "protect";
  var inputPath = "/" + requestId + "-input.pdf";
  var outputPath = "/" + requestId + "-output.pdf";
  var userPassword = typeof data.userPassword === "string" ? data.userPassword : "";
  var ownerPassword = typeof data.ownerPassword === "string" ? data.ownerPassword : "";
  var qpdf;

  try {
    self.postMessage({ type: "progress", value: 42 });
    qpdf = await getEngine();
    self.postMessage({ type: "progress", value: 58 });

    var inputBytes = new Uint8Array(data.bytes);
    if (!inputBytes.byteLength) throw new Error("empty-input");
    if (!userPassword || !ownerPassword) throw new Error("password-required");

    qpdf.FS.writeFile(inputPath, inputBytes);
    inputBytes = null;

    var args = [
      "--warning-exit-0",
      "--encrypt",
      "--user-password=" + userPassword,
      "--owner-password=" + ownerPassword,
      "--bits=256"
    ];

    if (data.allowPrint === false) args.push("--print=none");
    if (data.allowExtract === false) args.push("--extract=n");
    if (data.allowModify === false) {
      args.push("--modify=none", "--annotate=n", "--form=n", "--assemble=n", "--modify-other=n");
    }

    args.push("--", inputPath, outputPath);

    var result = qpdf.callMain(args);
    if (result !== 0) throw new Error("protect-failed");

    var output = qpdf.FS.readFile(outputPath);
    if (output.byteLength < 5 || String.fromCharCode.apply(null, output.subarray(0, 5)) !== "%PDF-") throw new Error("invalid-output");

    var copy = output.slice().buffer;
    self.postMessage({ type: "progress", value: 92 });
    self.postMessage({ type: "result", bytes: copy }, [copy]);
  } catch (error) {
    self.postMessage({ type: "error", code: error && error.message === "password-required" ? "password-required" : "processing-failed" });
  } finally {
    userPassword = "";
    ownerPassword = "";
    if (qpdf) {
      removeFile(qpdf, inputPath);
      removeFile(qpdf, outputPath);
    }
  }
};