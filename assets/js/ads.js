(function () {
  "use strict";

  var config = window.FreePDFMonetization || {};
  var client = String(config.adsenseClient || "").trim();
  var POPUNDER_SRC = "https://pl30806638.effectivecpmnetwork.com/64/d8/80/64d880a1349413fe7dcb55cf8a8b6379.js";
  var NATIVE_SRC = "https://pl30806640.effectivecpmnetwork.com/d0874cab14ed56771eb0d709062b71da/invoke.js";
  var SOCIAL_BAR_SRC = "https://pl30806641.effectivecpmnetwork.com/a8/89/7e/a8897ecee48386eabd13ef3cbb2661c5.js";
  var SMARTLINK_URL = "https://www.effectivecpmnetwork.com/c1kt57md?key=16cfe2b361699a8b0b12a8dc0c8c79b7";
  var NATIVE_CONTAINER_ID = "freepdf-native-ad";

  function appendScript(parent, src, attributes) {
    if (document.querySelector('script[src="' + src + '"]')) return null;
    var script = document.createElement("script");
    script.src = src;
    Object.keys(attributes || {}).forEach(function (key) {
      if (attributes[key] !== null && attributes[key] !== undefined) script.setAttribute(key, attributes[key]);
    });
    parent.appendChild(script);
    return script;
  }

  // Popunder: the supplied publisher instruction is "before </head>".
  appendScript(document.head, POPUNDER_SRC);

  function addSmartlink(parent) {
    var wrapper = document.createElement("div");
    wrapper.className = "ad-smartlink";

    var label = document.createElement("span");
    label.className = "ad-label";
    label.textContent = "Sponsored";

    var link = document.createElement("a");
    link.href = SMARTLINK_URL;
    link.target = "_blank";
    link.rel = "sponsored noopener noreferrer";
    link.textContent = "Explore sponsored offers";
    link.setAttribute("aria-label", "Explore sponsored offers in a new tab");

    wrapper.appendChild(label);
    wrapper.appendChild(link);
    parent.appendChild(wrapper);
  }

  function addNativeBanner() {
    if (document.getElementById(NATIVE_CONTAINER_ID)) return;

    var contentZone = document.querySelector('[data-ad-zone="content"]');
    if (!contentZone || !contentZone.parentNode) return;

    var native = document.createElement("div");
    native.id = NATIVE_CONTAINER_ID;
    native.className = "ad-container ad-native-container";
    native.setAttribute("aria-label", "Sponsored advertisement");

    var label = document.createElement("span");
    label.className = "ad-label";
    label.textContent = "Advertisement";
    native.appendChild(label);

    var networkContainer = document.createElement("div");
    networkContainer.id = "container-d0874cab14ed56771eb0d709062b71da";

    // Keep the EffectiveCPM native snippet together: script immediately before its container.
    var networkScript = document.createElement("script");
    networkScript.async = true;
    networkScript.setAttribute("data-cfasync", "false");
    networkScript.src = NATIVE_SRC;
    native.appendChild(networkScript);
    native.appendChild(networkContainer);

    contentZone.parentNode.insertBefore(native, contentZone.nextSibling);
    addSmartlink(native);
  }

  function addSocialBar() {
    // Publisher instruction: Social Bar goes immediately above </body>.
    if (document.querySelector('script[src="' + SOCIAL_BAR_SRC + '"]')) return;
    appendScript(document.body, SOCIAL_BAR_SRC);
  }

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

  function initEffectiveCpm() {
    addNativeBanner();
    addSocialBar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEffectiveCpm, { once: true });
  } else {
    initEffectiveCpm();
  }
}());
