import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { articlePages, indexablePages, pageLabels, pagePathname, supplementalPages } from "./site-config.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const branch = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH || "";
const productionBranch = !branch || branch === "main";
const defaultWorkersOrigin = "https://freepdfconverter.all-in-one-all.workers.dev";
const workersOrigin = process.env.WORKERS_CI && productionBranch ? defaultWorkersOrigin : "";
const suppliedOrigin = String(process.env.SITE_ORIGIN || (productionBranch ? process.env.CF_PAGES_URL || workersOrigin : "")).replace(/\/+$/, "");
const origin = /^https?:\/\/[^/]+$/i.test(suppliedOrigin) ? suppliedOrigin : "";
const adsensePublisherId = "ca-pub-6638412579880225";
const adsenseHead = [
  '<meta name="google-adsense-account" content="' + adsensePublisherId + '">',
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + adsensePublisherId + '" crossorigin="anonymous"></script>'
].join("\n");
const files = ["index.html", "about.html", "privacy.html", "terms.html", "contact.html", "404.html", "robots.txt", "ads.txt", "google0982473b0f1ce198.html", "_headers"];
const directories = ["assets", "tools", "guides"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of files) await cp(path.join(root, file), path.join(dist, file));
for (const directory of directories) await cp(path.join(root, directory), path.join(dist, directory), { recursive: true });

const htmlFiles = [...new Set([...indexablePages, ...supplementalPages, "404.html"])];
for (const relative of htmlFiles) {
  const file = path.join(dist, relative);
  const html = await readFile(file, "utf8");
  const withCleanLinks = rewriteInternalLinks(html);
  const head = relative === "404.html" ? "" : adsenseHead + "\n";
  await writeFile(file, withCleanLinks.replace("</head>", head + "</head>"), "utf8");
}

if (origin) {
  for (const relative of [...indexablePages, ...supplementalPages]) {
    const file = path.join(dist, relative);
    const html = await readFile(file, "utf8");
    const pathname = pagePathname(relative);
    const canonical = origin + pathname;
    const title = extract(html, /<title>([^<]+)<\/title>/i);
    const description = extract(html, /<meta\s+name="description"\s+content="([^"]+)"/i);
    const socialType = articlePages.has(relative) ? "article" : "website";
    const metadata = [
      '<link rel="canonical" href="' + canonical + '">',
      html.includes('property="og:title"') ? "" : '<meta property="og:title" content="' + escapeAttribute(title) + '">',
      html.includes('property="og:description"') ? "" : '<meta property="og:description" content="' + escapeAttribute(description) + '">',
      html.includes('property="og:type"') ? "" : '<meta property="og:type" content="' + socialType + '">',
      '<meta property="og:url" content="' + canonical + '">',
      '<meta name="twitter:card" content="summary">',
      '<meta name="twitter:title" content="' + escapeAttribute(title) + '">',
      '<meta name="twitter:description" content="' + escapeAttribute(description) + '">',
      articlePages.has(relative) ? '<meta property="article:published_time" content="2026-08-09">' : "",
      articlePages.has(relative) ? '<meta property="article:modified_time" content="2026-08-09">' : "",
      structuredData(relative, canonical, title, description)
    ].filter(Boolean).join("\n");
    const next = html.replace("</head>", metadata + "\n</head>");
    await writeFile(file, next, "utf8");
  }
  const urls = indexablePages.map((relative) => {
    return "  <url><loc>" + origin + pagePathname(relative) + "</loc></url>";
  }).join("\n");
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
  await writeFile(path.join(dist, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: " + origin + "/sitemap.xml\n", "utf8");
}

console.log("Built FreePDF Tools" + (origin ? " for " + origin : " without production canonical URLs"));

function extract(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || "";
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function rewriteInternalLinks(html) {
  return html.replace(/href="([^"]+)"/g, (full, href) => {
    if (/^(?:https?:|mailto:|data:|#)/i.test(href)) return full;
    const suffixIndex = href.search(/[?#]/);
    const suffix = suffixIndex >= 0 ? href.slice(suffixIndex) : "";
    const pathPart = suffixIndex >= 0 ? href.slice(0, suffixIndex) : href;
    if (!pathPart.endsWith(".html")) return full;
    let clean = pathPart.slice(0, -5);
    if (clean === "index") clean = "./";
    else if (clean.endsWith("/index")) clean = clean.slice(0, -5);
    return 'href="' + clean + suffix + '"';
  });
}

function structuredData(relative, canonical, title, description) {
  if (relative === "index.html") {
    return '<script type="application/ld+json">' + JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "FreePDF Tools",
      url: origin + "/",
      description,
      inLanguage: "en"
    }) + "</script>";
  }
  const breadcrumbItems = [{
    "@type": "ListItem",
    position: 1,
    name: "Home",
    item: origin + "/"
  }];
  if (relative.startsWith("guides/") && relative !== "guides/index.html") {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: "PDF Guides",
      item: origin + "/guides/"
    });
  }
  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name: pageLabels[relative] || title.replace(/\s*\|.*$/, "")
  });

  const graph = [{
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems
  }];
  if (articlePages.has(relative)) {
    graph.push({
      "@type": "Article",
      headline: pageLabels[relative],
      description,
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      datePublished: "2026-08-09",
      dateModified: "2026-08-09",
      inLanguage: "en",
      author: { "@type": "Organization", name: "FreePDF Tools", url: origin + "/about" },
      publisher: { "@type": "Organization", name: "FreePDF Tools", url: origin + "/about" }
    });
  }
  return '<script type="application/ld+json">' + JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph
  }).replace(/</g, "\\u003c") + "</script>";
}
