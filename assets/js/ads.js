(function () {
  "use strict";

  var config = window.FreePDFMonetization || {};
  var client = String(config.adsenseClient || "").trim();

  // EffectiveCPM is injected directly into the generated HTML by scripts/build.mjs.
  // Keeping those snippets in the HTML preserves the publisher-provided placement
  // and keeps the native script immediately adjacent to its required container.

  // Preserve the existing optional AdSense integration when configured.
  if (/^ca-pub-\d+$/.test(client)) {
    var script = document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
    if (!script) {
      script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
      document.head.appendChild(script);
    }

    document.querySelectorAll("[data-ad-zone]").forEach(function (container) {
      var zone = container.dataset.adZone;
      var slot = String((config.slots && config.slots[zone]) || "").trim();
      if (!/^\d+$/.test(slot)) return;

      var label = document.createElement("span");
      label.className = "ad-label";
      label.textContent = "Advertisement";

      var unit = document.createElement("ins");
      unit.className = "adsbygoogle";
      unit.style.display = "block";
      unit.dataset.adClient = client;
      unit.dataset.adSlot = slot;
      unit.dataset.adFormat = "auto";
      unit.dataset.fullWidthResponsive = "true";

      container.replaceChildren(label, unit);
      container.classList.add("is-active");
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }
}());
