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
  try { qpdf.FS.unlink(filename); } catch { /* ignore cleanup failures */ }
}

self.onmessage = async function (event) {
  var data = event.data || {};
  var requestId = String(data.id || "compress").replace(/[^a-z0-9_-]/gi, "").slice(0, 80) || "compress";
  var inputPath = "/" + requestId + "-input.pdf";
  var outputPath = "/" + requestId + "-output.pdf";
  var qpdf;

  try {
    self.postMessage({ type: "progress", value: 8 });

    qpdf = await getEngine();
    self.postMessage({ type: "progress", value: 24 });

    var inputBytes = new Uint8Array(data.bytes);
    if (!inputBytes.byteLength) throw new Error("empty-input");
    qpdf.FS.writeFile(inputPath, inputBytes);
    inputBytes = null;

    self.postMessage({ type: "progress", value: 34 });

    var encrypted = qpdf.callMain(["--is-encrypted", inputPath]) === 0;
    if (encrypted) throw new Error("encrypted-pdf");

    var result = qpdf.callMain([
      "--warning-exit-0",
      "--stream-data=compress",
      "--recompress-flate",
      "--compression-level=9",
      "--object-streams=generate",
      inputPath,
      outputPath
    ]);

    if (result !== 0) throw new Error("compress-failed");

    self.postMessage({ type: "progress", value: 86 });

    var output = qpdf.FS.readFile(outputPath);
    if (output.byteLength < 5 || String.fromCharCode.apply(null, output.subarray(0, 5)) !== "%PDF-") {
      throw new Error("invalid-output");
    }

    var outputCopy = output.slice().buffer;
    self.postMessage({
      type: "result",
      bytes: outputCopy,
      inputBytes: new Uint32Array([Number(data.inputSize) || 0])[0],
      outputBytes: output.byteLength
    }, [outputCopy]);

    self.postMessage({ type: "progress", value: 100 });
  } catch (error) {
    self.postMessage({
      type: "error",
      code: error && error.message === "encrypted-pdf"
        ? "encrypted-pdf"
        : error && error.message === "compress-failed"
          ? "compress-failed"
          : "processing-failed"
    });
  } finally {
    if (qpdf) {
      removeFile(qpdf, inputPath);
      removeFile(qpdf, outputPath);
    }
  }
};
