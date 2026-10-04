(function () {
  "use strict";

  // Android Chromium has had regressions where a native photo/file picker
  // returns to a page without delivering the selected FileList when a
  // restrictive accept attribute is present. The six new tools already
  // validate File objects in JavaScript, so on Android Chromium we deliberately
  // let the native picker use its generic file route and keep type validation
  // in the tool controller. Existing tools do not load this script.
  var isAndroidChromium = /Android/i.test(navigator.userAgent) &&
    /Chrome|Chromium|CriOS|EdgA|OPR/i.test(navigator.userAgent) &&
    !/Firefox|FxiOS/i.test(navigator.userAgent);

  if (!isAndroidChromium) return;

  document.querySelectorAll("input[type=\"file\"][data-new-tool-picker]").forEach(function (input) {
    input.removeAttribute("accept");
  });
}());
