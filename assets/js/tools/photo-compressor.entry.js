(function () {
  "use strict";
  import("/assets/js/tools/photo-compressor.tool.js")
    .then(function (module) { return module.mount(); })
    .catch(function (error) {
      console.error("FreePDF tool failed to initialize: photo-compressor", error);
      var status = document.querySelector('[role="status"]');
      if (status && window.FreePDF?.setStatus) {
        window.FreePDF.setStatus(status, "This tool could not start correctly. Refresh the page and try again.", "error");
      }
    });
}());
