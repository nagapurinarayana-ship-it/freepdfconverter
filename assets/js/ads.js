(function () {
  "use strict";

  var monetization = window.FreePDFMonetization || {};
  var key = String(monetization.bannerKey || "7b9ff27e517a15cbdb8b889b758ec1b");
  var nativeSrc = String(monetization.nativeSrc || "https://pl30806640.effectivecpmnetwork.com/d0874cab14ed56771eb0d709062b71da/invoke.js");
  var timeoutMs = 6500;

  function collapse(zone) {
    if (!zone) return;
    zone.dataset.adStatus = "unfilled";
    zone.classList.remove("is-active");
    zone.replaceChildren();
  }

  function label(zone, text) {
    var node = document.createElement("span");
    node.className = "ad-label";
    node.textContent = text;
    zone.appendChild(node);
  }

  function watchForFill(zone, labelNode, done) {
    var started = Date.now();
    var timer = window.setInterval(function () {
      var frame = zone.querySelector("iframe");
      var bodyContent = zone.querySelector("iframe, ins, [id*=\'container\'] > *, [class*=\'ad-\']");
      if (frame || bodyContent) {
        zone.dataset.adStatus = "filled";
        zone.classList.add("is-active");
        if (labelNode) labelNode.style.display = "";
        window.clearInterval(timer);
        done(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        collapse(zone);
        done(false);
      }
    }, 250);
  }

  function mountBanner(zone) {
    if (!zone || zone.dataset.bannerLoaded === "1") return;
    zone.dataset.bannerLoaded = "1";
    zone.dataset.adStatus = "loading";
    zone.replaceChildren();

    var labelNode = document.createElement("span");
    labelNode.className = "ad-label";
    labelNode.textContent = "Advertisement";
    zone.appendChild(labelNode);

    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.referrerPolicy = "no-referrer-when-downgrade";
    script.src = "https://www.highperformanceformat.com/" + encodeURIComponent(key) + "/invoke.js";

    // The network's banner loader reads the global atOptions object at execution time.
    // There is one banner slot per page, so keeping this direct (not sandboxed in
    // srcdoc) gives the provider the browser context it needs to return an ad.
    window.atOptions = {
      key: key,
      format: "iframe",
      height: 90,
      width: 728,
      params: {}
    };

    script.addEventListener("error", function () {
      collapse(zone);
    });

    zone.appendChild(script);
    watchForFill(zone, labelNode, function () {});
  }

  function mountNative(zone) {
    if (!zone || zone.dataset.bannerLoaded === "1") return;
    zone.dataset.bannerLoaded = "1";
    zone.dataset.adStatus = "loading";
    zone.replaceChildren();

    var labelNode = document.createElement("span");
    labelNode.className = "ad-label";
    labelNode.textContent = "Sponsored recommendations";
    zone.appendChild(labelNode);

    var container = document.createElement("div");
    container.id = "container-d0874cab14ed56771eb0d709062b71da";
    container.className = "ad-native-frame";
    zone.appendChild(container);

    var script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = nativeSrc;
    script.addEventListener("error", function () {
      collapse(zone);
    });

    zone.appendChild(script);
    watchForFill(zone, labelNode, function () {});
  }

  function mountConfiguredAdSense(zone, slot) {
    var client = String(monetization.adsenseClient || "");
    var adSlot = String(slot || "");
    if (!client || !adSlot || !zone) return false;

    zone.dataset.bannerLoaded = "1";
    zone.dataset.adStatus = "loading";
    zone.replaceChildren();

    var labelNode = document.createElement("span");
    labelNode.className = "ad-label";
    labelNode.textContent = "Advertisement";
    zone.appendChild(labelNode);

    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.style.width = "100%";
    ins.style.minHeight = "90px";
    ins.setAttribute("data-ad-client", client);
    ins.setAttribute("data-ad-slot", adSlot);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    zone.appendChild(ins);

    var script = document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
    if (!script) {
      script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
      document.head.appendChild(script);
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {
      collapse(zone);
      return false;
    }

    watchForFill(zone, labelNode, function () {});
    return true;
  }

  function mount(zone, type) {
    if (!zone) return;
    var slot = monetization.slots && monetization.slots[type];

    if (type === "top" && mountConfiguredAdSense(zone, slot)) return;
    if (type === "top") mountBanner(zone);
    else if (nativeSrc) mountNative(zone);
  }

  document.querySelectorAll('[data-ad-zone="top"]').forEach(function (zone) {
    mount(zone, "top");
  });

  document.querySelectorAll('[data-ad-zone="mid"], [data-ad-zone="footer"]').forEach(function (zone) {
    mount(zone, "content");
  });
}());