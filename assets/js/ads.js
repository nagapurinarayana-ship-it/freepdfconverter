(function () {
  "use strict";

  var key = "7b9ff27e517a15dcbdb8b889b758ec1b";
  var popunderSrc = "https://pl30806638.effectivecpmnetwork.com/64/d8/80/64d880a1349413fe7dcb55cf8a8b6379.js";
  var socialBarSrc = "https://pl30806641.effectivecpmnetwork.com/a8/89/7e/a8897ecee48386eabd13ef3cbb2661c5.js";
  var zone = document.querySelector('[data-ad-zone="top"]');

  if (zone && !zone.dataset.bannerLoaded) {
    var label = document.createElement("span");
    label.className = "ad-label";
    label.textContent = "Advertisement · 728×90";

    var frame = document.createElement("iframe");
    frame.title = "Advertisement";
    frame.width = "728";
    frame.height = "90";
    frame.loading = "eager";
    frame.style.cssText = "display:block;width:728px;max-width:100%;height:90px;margin:8px auto 0;border:0;overflow:hidden";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
    frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    frame.srcdoc = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>atOptions={key:"' + key + '",format:"iframe",height:90,width:728,params:{}};<\/script><script src="https://www.highperformanceformat.com/' + key + '/invoke.js"><\/script></body></html>';

    var nativeLabel = document.createElement("span");
    nativeLabel.className = "ad-label";
    nativeLabel.textContent = "Sponsored recommendations";
    var nativeFrame = document.createElement("iframe");
    nativeFrame.title = "Sponsored recommendations";
    nativeFrame.width = "100%";
    nativeFrame.height = "280";
    nativeFrame.loading = "lazy";
    nativeFrame.style.cssText = "display:block;width:100%;max-width:760px;height:280px;margin:20px auto 0;border:0;overflow:hidden";
    nativeFrame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
    nativeFrame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    nativeFrame.srcdoc = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;overflow:auto;background:transparent}</style></head><body><script async data-cfasync="false" src="https://pl30806640.effectivecpmnetwork.com/d0874cab14ed56771eb0d709062b71da/invoke.js"><\/script><div id="container-d0874cab14ed56771eb0d709062b71da"></div></body></html>';

    var extraLabel = document.createElement("span");
    extraLabel.className = "ad-label";
    extraLabel.textContent = "More sponsored offers";
    var extraFrame = document.createElement("iframe");
    extraFrame.title = "More sponsored offers";
    extraFrame.width = "100%";
    extraFrame.height = "140";
    extraFrame.loading = "lazy";
    extraFrame.style.cssText = "display:block;width:100%;max-width:760px;height:140px;margin:20px auto 0;border:0;overflow:hidden";
    extraFrame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
    extraFrame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    extraFrame.srcdoc = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;min-height:120px;overflow:hidden;background:transparent}</style></head><body><script src="' + popunderSrc + '"><\/script><script src="' + socialBarSrc + '"><\/script></body></html>';

    zone.replaceChildren(label, frame, nativeLabel, nativeFrame, extraLabel, extraFrame);
    zone.classList.add("is-active");
    zone.dataset.bannerLoaded = "1";
  }

}());
