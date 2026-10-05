(function () {
  "use strict";

  var config = window.FreePDFMonetization || {};
  var adsterra = config.adsterra || {};
  var adsenseClient = String(config.adsenseClient || "").trim();
  var adsenseAutoAds = config.adsenseAutoAds === true;
  var slots = config.slots || {};
  var bannerKey = String(adsterra.bannerKey || "").trim();
  var bannerSrc = String(adsterra.bannerSrc || "").trim();
  var nativeSrc = String(adsterra.nativeSrc || "").trim();
  var popunderSrc = String(adsterra.popunderSrc || "").trim();
  var socialBarSrc = String(adsterra.socialBarSrc || "").trim();
  var smartlinkUrl = String(adsterra.smartlinkUrl || "").trim();
  var fallbackDelay = 5500;
  var nativeMounted = false;
  var smartlinkMounted = false;

  function addLabel(zone, text) {
    var label = document.createElement("span");
    label.className = "ad-label";
    label.textContent = text;
    zone.appendChild(label);
    return label;
  }

  function clearZone(zone) {
    if (!zone) return;
    zone.replaceChildren();
    zone.dataset.adStatus = "unfilled";
    zone.classList.remove("is-active");
    zone.style.minHeight = "0";
    zone.style.marginBlock = "0";
    zone.setAttribute("aria-hidden", "true");
  }

  function activateZone(zone) {
    if (!zone) return;
    zone.dataset.adStatus = "filled";
    zone.classList.add("is-active");
    zone.style.minHeight = "90px";
    zone.style.marginBlock = "24px";
    zone.removeAttribute("aria-hidden");
  }

  function hasScriptSource(src) {
    var scripts = document.scripts || [];
    for (var i = 0; i < scripts.length; i += 1) {
      if (scripts[i].src === src) return true;
    }
    return false;
  }

  function appendExternalScript(src, attributes, parent, onError) {
    if (!src || hasScriptSource(src)) return null;
    var script = document.createElement("script");
    script.src = src;
    Object.keys(attributes || {}).forEach(function (name) {
      if (attributes[name] !== undefined && attributes[name] !== null) script.setAttribute(name, attributes[name]);
    });
    if (onError) script.addEventListener("error", onError, { once: true });
    (parent || document.head).appendChild(script);
    return script;
  }

  function loadAdSense() {
    if (!adsenseClient) return false;
    var existing = document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
    if (existing) return true;
    var script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(adsenseClient);
    document.head.appendChild(script);
    return true;
  }

  function mountAdSenseUnit(zone, slot, labelText) {
    if (!zone || !adsenseClient || !/^\d+$/.test(String(slot || ""))) return false;
    zone.dataset.adProvider = "adsense";
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
    activateZone(zone);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      return true;
    } catch (_) {
      clearZone(zone);
      return false;
    }
  }

  function fallback(zone, slot, labelText, preferNative) {
    if (preferNative && !nativeMounted && nativeSrc) {
      mountNative(zone);
      return;
    }
    if (mountAdSenseUnit(zone, slot, labelText)) return;
    if (adsenseAutoAds) loadAdSense();
    clearZone(zone);
  }

  function waitForPrimary(zone, slot, labelText, isFilled) {
    var started = Date.now();
    var timer = window.setInterval(function () {
      if (!document.documentElement.contains(zone)) {
        window.clearInterval(timer);
        return;
      }
      if (isFilled()) {
        activateZone(zone);
        window.clearInterval(timer);
        return;
      }
      if (Date.now() - started >= fallbackDelay) {
        window.clearInterval(timer);
        fallback(zone, slot, labelText);
      }
    }, 250);
  }

  function mountBanner(zone) {
    if (!zone || !bannerKey || !bannerSrc || zone.dataset.adLoaded === "1") return;
    zone.dataset.adLoaded = "1";
    zone.dataset.adProvider = "adsterra";
    zone.dataset.adStatus = "loading";
    zone.replaceChildren();
    addLabel(zone, "Advertisement");

    var bannerDocument = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;display:flex;justify-content:center;overflow:hidden"><script>atOptions={key:"' + bannerKey + '",format:"iframe",height:90,width:728,params:{}};<\/script><script src="' + bannerSrc + '"><\/script></body></html>';
    var iframe = document.createElement("iframe");
    iframe.title = "Advertisement";
    iframe.width = "728";
    iframe.height = "90";
    iframe.loading = "lazy";
    iframe.scrolling = "no";
    iframe.frameBorder = "0";
    iframe.style.display = "block";
    iframe.style.width = "728px";
    iframe.style.height = "90px";
    iframe.style.maxWidth = "100%";
    iframe.style.margin = "0 auto";
    iframe.style.border = "0";
    iframe.srcdoc = bannerDocument;
    zone.appendChild(iframe);
    zone.classList.add("is-active");
    zone.removeAttribute("aria-hidden");

    var onLoad = function () {
      activateZone(zone);
    };
    iframe.addEventListener("load", onLoad, { once: true });

    window.setTimeout(function () {
      if (!document.documentElement.contains(zone)) return;

      var iframeDocument = null;
      try {
        iframeDocument = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document) || null;
      } catch (_) {
        iframeDocument = null;
      }

      var iframeFilled = Boolean(
        iframeDocument &&
        (
          iframeDocument.querySelector("iframe, video, img, object, embed") ||
          (iframeDocument.body && iframeDocument.body.textContent.trim().length > 24)
        )
      );

      if (!iframeFilled) {
        fallback(zone, slots.top, "Advertisement", true);
      }
    }, fallbackDelay);
  }

  function mountNative(zone) {
    if (!zone || !nativeSrc || nativeMounted || zone.dataset.adLoaded === "1") return;
    nativeMounted = true;
    zone.dataset.adLoaded = "1";
    zone.dataset.adProvider = "adsterra";
    zone.dataset.adStatus = "loading";
    zone.replaceChildren();
    addLabel(zone, "Sponsored recommendations");

    var container = document.createElement("div");
    container.className = "ad-native-frame";
    container.id = "container-d0874cab14ed56771eb0d709062b71da";
    container.style.width = "100%";
    container.style.minHeight = "80px";
    zone.appendChild(container);

    var script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = nativeSrc;
    script.addEventListener("error", function () {
      nativeMounted = false;
      fallback(zone, slots.content || "", "Advertisement", false);
    }, { once: true });
    zone.appendChild(script);
    activateZone(zone);

    waitForPrimary(zone, slots.content || "", "Advertisement", function () {
      return Boolean(container.children.length || container.querySelector("iframe"));
    });
  }

  function mountSmartlink(zone) {
    if (!zone || !smartlinkUrl || smartlinkMounted) return;
    smartlinkMounted = true;
    zone.dataset.adProvider = "adsterra";
    zone.dataset.adStatus = "filled";
    zone.replaceChildren();
    var wrap = document.createElement("div");
    wrap.className = "ad-smartlink";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";
    wrap.style.gap = "10px";
    wrap.style.padding = "10px 0";
    var label = document.createElement("span");
    label.className = "ad-label";
    label.style.width = "auto";
    label.style.margin = "0";
    label.textContent = "Sponsored";
    var link = document.createElement("a");
    link.href = smartlinkUrl;
    link.target = "_blank";
    link.rel = "sponsored noopener noreferrer";
    link.textContent = "Explore sponsored offers";
    link.setAttribute("aria-label", "Explore sponsored offers");
    wrap.appendChild(label);
    wrap.appendChild(link);
    zone.appendChild(wrap);
    activateZone(zone);
  }

  function loadGlobalAdsterraFormats() {
    if (popunderSrc) appendExternalScript(popunderSrc, {}, document.head);
    if (socialBarSrc) appendExternalScript(socialBarSrc, {}, document.body);
  }

  function moveHomeTopAd() {
    if (!document.body.classList.contains("home-page")) return;
    var zone = document.querySelector('[data-ad-zone="top"]');
    var popular = document.querySelector(".hero-popular");
    var tools = document.querySelector(".home-tools-section");
    if (!zone || !popular || !tools || popular.contains(zone)) return;
    var host = zone.parentElement;
    if (host && host.classList.contains("container")) {
      popular.parentNode.insertBefore(host, tools);
    } else {
      popular.parentNode.insertBefore(zone, tools);
    }
  }

  function init() {
    moveHomeTopAd();

    document.querySelectorAll('[data-ad-zone="top"]').forEach(function (zone) {
      mountBanner(zone);
    });

    var nativeZones = document.querySelectorAll('[data-ad-zone="content"], [data-ad-zone="mid"]');
    for (var i = 0; i < nativeZones.length; i += 1) {
      if (!nativeMounted) mountNative(nativeZones[i]);
    }

    var footerZones = document.querySelectorAll('[data-ad-zone="footer"]');
    footerZones.forEach(function (zone) {
      if (slots.footer) {
        mountAdSenseUnit(zone, slots.footer, "Advertisement");
      } else {
        mountSmartlink(zone);
      }
    });

    var loadGlobal = function () {
      window.setTimeout(loadGlobalAdsterraFormats, 900);
    };
    if (document.readyState === "complete") loadGlobal();
    else window.addEventListener("load", loadGlobal, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());
