(function () {
  "use strict";

  var config = window.FreePDFMonetization || {};
  var adsterra = config.adsterra || {};
  var adsenseClient = String(config.adsenseClient || "").trim();
  var adsenseAutoAds = config.adsenseAutoAds === true;
  var slots = config.slots || {};
  var bannerKey = String(adsterra.bannerKey || "").trim();
  var nativeSrc = String(adsterra.nativeSrc || "").trim();
  var popunderSrc = String(adsterra.popunderSrc || "").trim();
  var socialBarSrc = String(adsterra.socialBarSrc || "").trim();
  var smartlinkUrl = String(adsterra.smartlinkUrl || "").trim();
  var fallbackDelay = 5500;

  function markUnfilled(zone) {
    if (!zone) return;
    zone.dataset.adStatus = "unfilled";
    zone.classList.remove("is-active");
    zone.replaceChildren();
  }

  function addLabel(zone, text) {
    var label = document.createElement("span");
    label.className = "ad-label";
    label.textContent = text;
    zone.appendChild(label);
    return label;
  }

  function loadScript(src, attributes, onError) {
    if (!src) return null;
    if (document.querySelector('script[src="' + CSS.escape(src) + '"]')) return null;

    var script = document.createElement("script");
    script.src = src;
    Object.keys(attributes || {}).forEach(function (name) {
      if (attributes[name] !== undefined && attributes[name] !== null) script.setAttribute(name, attributes[name]);
    });
    if (onError) script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
    return script;
  }

  function loadAdSense(onError) {
    if (!adsenseClient) return false;
    if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return true;

    var script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(adsenseClient);
    if (onError) script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
    return true;
  }

  function mountAdSenseUnit(zone, slot, labelText) {
    if (!zone || !adsenseClient || !/^\d+$/.test(String(slot || ""))) return false;

    zone.dataset.adStatus = "fallback";
    zone.replaceChildren();
    addLabel(zone, labelText || "Advertisement");

    var unit = document.createElement("ins");
    unit.className = "adsbygoogle";
    unit.style.display = "block";
    unit.style.width = "100%";
    unit.style.minHeight = "90px";
    unit.setAttribute("data-ad-client", adsenseClient);
    unit.setAttribute("data-ad-slot", String(slot));
    unit.setAttribute("data-ad-format", "auto");
    unit.setAttribute("data-full-width-responsive", "true");
    zone.appendChild(unit);
    zone.classList.add("is-active");

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      return true;
    } catch (_) {
      markUnfilled(zone);
      return false;
    }
  }

  function fallback(zone, slot, labelText) {
    if (mountAdSenseUnit(zone, slot, labelText)) return;
    if (adsenseAutoAds && loadAdSense()) {
      // Auto Ads can place an AdSense impression elsewhere on the page when
      // no manually configured slot exists. Do not leave an empty reserved box.
      markUnfilled(zone);
      return;
    }
    markUnfilled(zone);
  }

  function observePrimary(zone, slot, labelText, detector, mount) {
    var started = Date.now();
    var timer = window.setInterval(function () {
      if (!document.documentElement.contains(zone)) {
        window.clearInterval(timer);
        return;
      }

      if (detector()) {
        zone.dataset.adStatus = "filled";
        zone.classList.add("is-active");
        window.clearInterval(timer);
        return;
      }

      if (Date.now() - started >= fallbackDelay) {
        window.clearInterval(timer);
        fallback(zone, slot, labelText);
      }
    }, 250);

    mount();
  }

  function mountBanner(zone) {
    if (!zone || !bannerKey || zone.dataset.bannerLoaded === "1") return;
    zone.dataset.bannerLoaded = "1";
    zone.dataset.adProvider = "adsterra";
    zone.dataset.adStatus = "loading";
    zone.replaceChildren();
    addLabel(zone, "Advertisement");

    var atOptions = document.createElement("script");
    atOptions.type = "text/javascript";
    atOptions.text = 'atOptions = { key: "' + bannerKey + '", format: "iframe", height: 90, width: 728, params: {} };';

    var invoke = document.createElement("script");
    invoke.type = "text/javascript";
    invoke.src = "https://www.highperformanceformat.com/" + encodeURIComponent(bannerKey) + "/invoke.js";

    var onLoadError = function () {
      fallback(zone, slots.top, "Advertisement");
    };
    invoke.addEventListener("error", onLoadError, { once: true });

    observePrimary(
      zone,
      slots.top,
      "Advertisement",
      function () { return Boolean(zone.querySelector("iframe")); },
      function () {
        zone.appendChild(atOptions);
        zone.appendChild(invoke);
        zone.classList.add("is-active");
      }
    );
  }

  function mountNative(zone, slotName) {
    if (!zone || !nativeSrc || zone.dataset.bannerLoaded === "1") return;
    zone.dataset.bannerLoaded = "1";
    zone.dataset.adProvider = "adsterra";
    zone.dataset.adStatus = "loading";
    zone.replaceChildren();

    addLabel(zone, "Sponsored recommendations");

    var container = document.createElement("div");
    container.className = "ad-native-frame";
    container.id = "container-d0874cab14ed56771eb0d709062b71da-" + Math.random().toString(36).slice(2);
    zone.appendChild(container);

    if (smartlinkUrl) {
      var smart = document.createElement("div");
      smart.className = "ad-smartlink";
      var smartLabel = document.createElement("span");
      smartLabel.className = "ad-label";
      smartLabel.textContent = "Sponsored";
      var link = document.createElement("a");
      link.href = smartlinkUrl;
      link.target = "_blank";
      link.rel = "sponsored noopener noreferrer";
      link.textContent = "Explore sponsored offers";
      smart.appendChild(smartLabel);
      smart.appendChild(link);
      zone.appendChild(smart);
    }

    var script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = nativeSrc;
    script.addEventListener("error", function () {
      fallback(zone, slots[slotName] || "", "Advertisement");
    }, { once: true });
    zone.appendChild(script);

    observePrimary(
      zone,
      slots[slotName] || "",
      "Advertisement",
      function () {
        return Boolean(container.children.length || container.querySelector("iframe"));
      },
      function () {
        zone.classList.add("is-active");
      }
    );
  }

  function loadGlobalAdsterraFormats() {
    if (popunderSrc) {
      loadScript(popunderSrc, {}, function () {
        if (adsenseAutoAds) loadAdSense();
      });
    }
    if (socialBarSrc) {
      loadScript(socialBarSrc, {}, function () {
        if (adsenseAutoAds) loadAdSense();
      });
    }
  }

  function init() {
    loadGlobalAdsterraFormats();

    document.querySelectorAll('[data-ad-zone="top"]').forEach(function (zone) {
      mountBanner(zone);
    });

    document.querySelectorAll('[data-ad-zone="content"], [data-ad-zone="mid"]').forEach(function (zone) {
      mountNative(zone, "content");
    });

    document.querySelectorAll('[data-ad-zone="footer"]').forEach(function (zone) {
      mountNative(zone, "footer");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());