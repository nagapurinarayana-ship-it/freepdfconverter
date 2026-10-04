(function () {
  "use strict";

  var key = "7b9ff27e517a15cbdb8b889b758ec1b";
  var nativeSrc = "https://pl30806640.effectivecpmnetwork.com/d0874cab14ed56771eb0d709062b71da/invoke.js";

  function createFrame(width, height, loading, srcdoc) {
    var frame = document.createElement("iframe");
    frame.title = "Advertisement";
    frame.width = String(width);
    frame.height = String(height);
    frame.loading = loading;
    frame.style.cssText = "display:block;width:100%;max-width:" + width + "px;height:" + height + "px;margin:0 auto;border:0;overflow:hidden";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
    frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    frame.srcdoc = srcdoc;
    return frame;
  }

  function mount(zone, type) {
    if (!zone || zone.dataset.bannerLoaded === "1") return;

    var label = document.createElement("span");
    label.className = "ad-label";
    label.textContent = type === "top" ? "Advertisement" : "Sponsored recommendations";

    var frame;
    if (type === "top") {
      frame = createFrame(728, 90, "eager",
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>atOptions={key:"' + key + '",format:"iframe",height:90,width:728,params:{}};<\/script><script src="https://www.highperformanceformat.com/' + key + '/invoke.js"><\/script></body></html>'
      );
    } else {
      frame = createFrame(760, 180, "lazy",
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;min-height:180px;overflow:auto;background:transparent}</style></head><body><script async data-cfasync="false" src="' + nativeSrc + '"><\/script><div id="container-d0874cab14ed56771eb0d709062b71da"></div></body></html>'
      );
    }

    zone.replaceChildren(label, frame);
    zone.classList.add("is-active");
    zone.dataset.bannerLoaded = "1";
  }

  document.querySelectorAll('[data-ad-zone="top"]').forEach(function (zone) {
    mount(zone, "top");
  });
  document.querySelectorAll('[data-ad-zone="mid"], [data-ad-zone="footer"]').forEach(function (zone) {
    mount(zone, "native");
  });
}());