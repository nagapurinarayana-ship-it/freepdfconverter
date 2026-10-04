(function () {
  "use strict";

  var monetization = window.FreePDFMonetization || {};
  var client = String(monetization.adsenseClient || "");
  var autoAds = monetization.autoAds === true;
  var slots = monetization.slots || {};

  function collapse(zone) {
    if (!zone) return;
    zone.dataset.adStatus = "unfilled";
    zone.classList.remove("is-active");
    zone.replaceChildren();
  }

  function loadAdSense() {
    if (!client) return false;
    if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return true;

    var script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
    script.addEventListener("error", function () {
      document.querySelectorAll("[data-ad-zone]").forEach(collapse);
    });
    document.head.appendChild(script);
    return true;
  }

  function mountUnit(zone, slot, labelText) {
    if (!zone || !client || !slot) {
      if (zone) collapse(zone);
      return;
    }

    zone.dataset.adStatus = "loading";
    zone.replaceChildren();

    var label = document.createElement("span");
    label.className = "ad-label";
    label.textContent = labelText;
    zone.appendChild(label);

    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.style.width = "100%";
    ins.style.minHeight = "90px";
    ins.setAttribute("data-ad-client", client);
    ins.setAttribute("data-ad-slot", slot);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    zone.appendChild(ins);
    zone.classList.add("is-active");

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {
      collapse(zone);
    }
  }

  if (!client) {
    document.querySelectorAll("[data-ad-zone]").forEach(collapse);
    return;
  }

  loadAdSense();

  if (!autoAds) {
    document.querySelectorAll('[data-ad-zone="top"]').forEach(function (zone) {
      mountUnit(zone, slots.top, "Advertisement");
    });
    document.querySelectorAll('[data-ad-zone="mid"], [data-ad-zone="footer"]').forEach(function (zone) {
      mountUnit(zone, slots.content || slots.footer, "Advertisement");
    });
  } else {
    // Auto Ads are controlled by the AdSense account. Keep our manually reserved
    // boxes empty so we do not create large blank regions while Auto Ads decides
    // whether and where an in-page ad should appear.
    document.querySelectorAll("[data-ad-zone]").forEach(collapse);
  }
}());