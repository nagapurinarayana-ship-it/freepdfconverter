/*
 * FreePDF Tools monetization configuration.
 * Keep AdSense blank until the publisher account and ad units are approved.
 * The fallback banner/native providers are isolated here so ads.js remains
 * a stable loader and can fail closed when a provider does not fill.
 */
window.FreePDFMonetization = Object.freeze({
  adsenseClient: "",
  bannerKey: "7b9ff27e517a15cbdb8b889b758ec1b",
  nativeSrc: "https://pl30806640.effectivecpmnetwork.com/d0874cab14ed56771eb0d709062b71da/invoke.js",
  slots: Object.freeze({
    top: "",
    content: "",
    footer: ""
  })
});
