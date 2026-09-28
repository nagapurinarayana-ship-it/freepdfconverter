import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOCALES, PAGE_KEYS, allLocalizedPaths, englishPath, getLocalizedPage, localePagePath } from "./localized-content.mjs";

const dist = path.join(process.cwd(), "dist");
const origin = (process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/$/, "");
const cssFiles = await readdir(path.join(dist, "assets", "css"));
const stylesheet = cssFiles.find((name) => /^styles\.[a-f0-9]{10}\.css$/.test(name));
if (!stylesheet) throw new Error("Fingerprinting stylesheet not found before localized page generation.");

for (const { locale, key } of allLocalizedPaths()) {
  const data = getLocalizedPage(locale, key);
  if (!data) throw new Error("Missing localized content: " + locale + "/" + key);
  const dir = path.join(dist, locale);
  await mkdir(dir, { recursive: true });
  const canonical = origin + localePagePath(locale, key);
  const english = englishPath(key);
  const toolHref = origin + english;
  const languageLinks = [
    `<a href="/de/">Deutsch</a>`,
    `<a href="/fr/">Français</a>`,
    `<a href="/es/">Español</a>`
  ].filter((_, index) => Object.keys(LOCALES)[index] !== locale).join(" · ");

  const sections = data.sections.map(([heading, text]) => `<section class="section alt"><div class="container content-narrow"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></div></section>`).join("");
  const links = PAGE_KEYS.filter((other) => other !== key).slice(0, 5).map((other) => {
    const otherData = getLocalizedPage(locale, other);
    return `<li><a href="${localePagePath(locale, other)}">${escapeHtml(otherData.h1)}</a></li>`;
  }).join("");

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.title)}</title>
<meta name="description" content="${escapeAttribute(data.description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/${stylesheet}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:site_name" content="FreePDF Tools">
<meta property="og:title" content="${escapeAttribute(data.title)}"><meta property="og:description" content="${escapeAttribute(data.description)}"><meta property="og:url" content="${canonical}">
<meta property="og:image" content="${origin}/assets/images/freepdf-tools-social.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeAttribute(data.title)}"><meta name="twitter:description" content="${escapeAttribute(data.description)}"><meta name="twitter:image" content="${origin}/assets/images/freepdf-tools-social.jpg">
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    url: canonical,
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "FreePDF Tools", url: origin + "/" }
  }).replace(/</g, "\\u003c")}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="container header-inner">
<a class="logo" href="/"><span class="logo-mark" aria-hidden="true">PDF</span><span>FreePDF Tools</span></a>
<nav class="main-nav" aria-label="Language navigation"><a href="/de/">DE</a><a href="/fr/">FR</a><a href="/es/">ES</a></nav>
</div></header>
<main id="main">
<section class="hero"><div class="container hero-grid"><div>
<span class="eyebrow">${escapeHtml(data.eyebrow)}</span>
<h1>${escapeHtml(data.h1)}</h1>
<p class="lead">${escapeHtml(data.lead)}</p>
<div class="hero-actions"><a class="button" href="${toolHref}">${escapeHtml(data.cta)} →</a><a class="button secondary" href="/guides/">PDF Guides</a></div>
</div>
<aside class="trust-card"><strong>FreePDF Tools</strong><ul class="trust-list"><li><span class="check">✓</span><span>Browser-based processing</span></li><li><span class="check">✓</span><span>No account required</span></li><li><span class="check">✓</span><span>Supported workflows avoid document upload</span></li></ul></aside>
</div></section>
${sections}
<section class="section"><div class="container content-narrow"><h2>Mehr PDF-Aufgaben / Plus de tâches PDF / Más tareas PDF</h2><p>${escapeHtml(languageLinks)}</p><ul class="footer-links">${links}</ul></div></section>
</main>
<footer class="site-footer"><div class="container"><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} FreePDF Tools</span><span>PDF processing in your browser</span></div></div></footer>
</body></html>`;

  const pagePath = localePagePath(locale, key);
  const relativePage = pagePath.replace(new RegExp("^/" + locale + "/"), "");
  const outputFile = pagePath.endsWith("/")
    ? path.join(dist, relativePage, "index.html")
    : path.join(dist, locale, relativePage + ".html");
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, html, "utf8");
}

console.log("Generated localized DE/FR/ES landing pages: " + allLocalizedPaths().length);

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
