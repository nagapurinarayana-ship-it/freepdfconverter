import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { articlePages, articlePublishedDates, indexablePages, pageDates, pageLabels, pagePathname, supplementalPages } from "./site-config.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const branch = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH || "";
const productionBranch = !branch || branch === "main";
const defaultWorkersOrigin = "https://freepdfconverter.all-in-one-all.workers.dev";
const workersOrigin = process.env.WORKERS_CI && productionBranch ? defaultWorkersOrigin : "";
const suppliedOrigin = String(process.env.SITE_ORIGIN || (productionBranch ? process.env.CF_PAGES_URL || workersOrigin : "")).replace(/\/+$/, "");
const origin = /^https?:\/\/[^/]+$/i.test(suppliedOrigin) ? suppliedOrigin : "";

const appHead = [
  '<link rel="manifest" href="/manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="/assets/icons/icon-192.png">'
].join("\n");
const files = ["index.html", "about.html", "how-local-processing.html", "unlock-pdf-online.html", "merge-pdf-online.html", "split-pdf-online.html", "jpg-to-pdf-online.html", "privacy.html", "terms.html", "contact.html", "404.html", "offline.html", "manifest.webmanifest", "service-worker.js", "robots.txt", "ads.txt", "favicon.ico", "google0982473b0f1ce198.html", "_headers", "_redirects"];
const directories = ["assets", "tools", "guides"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const htmlFiles = [...new Set([...indexablePages, ...supplementalPages, "404.html"])];
const copyCandidates = [...files, ...htmlFiles.filter((relative) => !files.includes(relative))];
for (const relative of copyCandidates) {
  const source = path.join(root, relative);
  const target = path.join(dist, relative);
  await cp(source, target);
}
for (const directory of directories) await cp(path.join(root, directory), path.join(dist, directory), { recursive: true });

for (const relative of htmlFiles) {
  const file = path.join(dist, relative);
  const html = await readFile(file, "utf8");
  const withCleanLinks = rewriteInternalLinks(html);
  const head = relative === "404.html" ? "" : appHead + "\n";
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
    const socialImage = origin + "/assets/images/freepdf-tools-social.jpg";
    const published = articlePublishedDates[relative] || pageDates[relative] || "2026-08-11";
    const modified = pageDates[relative] || published;
    const metadata = [
      '<link rel="canonical" href="' + canonical + '">',
      '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
      html.includes('property="og:site_name"') ? "" : '<meta property="og:site_name" content="FreePDF Tools">',
      html.includes('property="og:title"') ? "" : '<meta property="og:title" content="' + escapeAttribute(title) + '">',
      html.includes('property="og:description"') ? "" : '<meta property="og:description" content="' + escapeAttribute(description) + '">',
      html.includes('property="og:type"') ? "" : '<meta property="og:type" content="' + socialType + '">',
      '<meta property="og:url" content="' + canonical + '">',
      '<meta property="og:image" content="' + socialImage + '">',
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta property="og:image:alt" content="FreePDF Tools private browser PDF utilities">',
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta name="twitter:title" content="' + escapeAttribute(title) + '">',
      '<meta name="twitter:description" content="' + escapeAttribute(description) + '">',
      '<meta name="twitter:image" content="' + socialImage + '">',
      '<meta name="twitter:image:alt" content="FreePDF Tools private browser PDF utilities">',
      articlePages.has(relative) ? '<meta property="article:published_time" content="' + published + '">' : "",
      articlePages.has(relative) ? '<meta property="article:modified_time" content="' + modified + '">' : "",
      structuredData(relative, canonical, title, description)
    ].filter(Boolean).join("\n");
    const next = html.replace("</head>", metadata + "\n</head>");
    await writeFile(file, next, "utf8");
  }
  const urls = indexablePages.map((relative) => {
    return "  <url><loc>" + origin + pagePathname(relative) + "</loc><lastmod>" + pageDates[relative] + "</lastmod></url>";
  }).join("\n");
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
  await writeFile(path.join(dist, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: " + origin + "/sitemap.xml\n", "utf8");
}

const fingerprintedAssets = await fingerprintAssets();
await buildServiceWorker(fingerprintedAssets);

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
      inLanguage: "en",
      publisher: {
        "@type": "Organization",
        name: "FreePDF Tools",
        url: origin + "/about"
      }
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
    name: pageLabels[relative] || title.replace(/\s*\|.*$/, ""),
    item: canonical
  });

  const graph = [{
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems
  }];

  if (relative === "guides/index.html") {
    graph.push({
      "@type": "CollectionPage",
      name: pageLabels[relative] || "PDF Guides",
      url: canonical,
      description,
      isPartOf: { "@type": "WebSite", name: "FreePDF Tools", url: origin + "/" },
      inLanguage: "en"
    });
  }

  const toolPages = new Set([
    "tools/merge-pdf.html",
    "tools/split-pdf.html",
    "tools/unlock-pdf.html",
    "tools/rotate-pdf.html",
    "tools/jpg-to-pdf.html",
    "tools/pdf-to-image.html",
    "tools/watermark-pdf.html",
    "tools/organize-pdf.html",
    "tools/add-page-numbers.html",
    "tools/remove-pdf-metadata.html",
    "tools/crop-pdf.html",
    "tools/extract-pdf-text.html"
  ]);

  if (toolPages.has(relative)) {
    graph.push({
      "@type": "SoftwareApplication",
      name: pageLabels[relative] || title.replace(/\s*\|.*$/, ""),
      url: canonical,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web browser",
      description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isAccessibleForFree: true,
      inLanguage: "en"
    });
  }

  if (articlePages.has(relative)) {
    const published = articlePublishedDates[relative] || pageDates[relative];
    graph.push({
      "@type": "Article",
      headline: pageLabels[relative],
      description,
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      datePublished: published,
      dateModified: pageDates[relative],
      image: [origin + "/assets/images/freepdf-tools-social.jpg"],
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

async function fingerprintAssets() {
  const assetRoot = path.join(dist, "assets");
  const vendorTargets = (await walk(path.join(assetRoot, "vendor"))).filter((file) => /\.(?:js|mjs|wasm)$/i.test(file));
  const vendorMappings = await fingerprintGroup(vendorTargets);
  const applicationTargets = (await walk(assetRoot)).filter((file) => /\.(?:css|js|mjs)$/i.test(file) && !file.startsWith(path.join(assetRoot, "vendor") + path.sep));
  const applicationMappings = await fingerprintGroup(applicationTargets);
  return [...vendorMappings, ...applicationMappings];
}

async function fingerprintGroup(targets) {
  const mappings = [];
  for (const file of targets) {
    const content = await readFile(file);
    const hash = createHash("sha256").update(content).digest("hex").slice(0, 10);
    const extension = path.extname(file);
    const fingerprinted = file.slice(0, -extension.length) + "." + hash + extension;
    mappings.push({
      file,
      fingerprinted,
      oldPath: path.relative(dist, file).split(path.sep).join("/"),
      newPath: path.relative(dist, fingerprinted).split(path.sep).join("/")
    });
  }

  const textFiles = (await walk(dist)).filter((file) => /\.(?:html|js|mjs|css|json|webmanifest)$/i.test(file) || path.basename(file) === "service-worker.js");
  for (const file of textFiles) {
    let content = await readFile(file, "utf8");
    for (const mapping of mappings) content = content.split(mapping.oldPath).join(mapping.newPath);
    await writeFile(file, content, "utf8");
  }
  for (const mapping of mappings) await rename(mapping.file, mapping.fingerprinted);
  return mappings;
}

async function buildServiceWorker(mappings) {
  const serviceWorkerPath = path.join(dist, "service-worker.js");
  let source = await readFile(serviceWorkerPath, "utf8");
  const urls = [
    "/",
    "/offline",
    "/manifest.webmanifest",
    "/favicon.ico",
    "/assets/favicon.svg",
    "/assets/icons/icon-192.png",
    "/assets/icons/icon-512.png",
    "/assets/images/freepdf-tools-social.jpg",
    ...indexablePages.filter((relative) => relative !== "index.html").map(pagePathname),
    ...mappings.map((mapping) => "/" + mapping.newPath)
  ];
  const uniqueUrls = [...new Set(urls)];
  const version = createHash("sha256").update(JSON.stringify(uniqueUrls)).digest("hex").slice(0, 10);
  source = source.replace('"__CACHE_VERSION__"', JSON.stringify(version));
  source = source.replace("/*__PRECACHE_URLS__*/[]", JSON.stringify(uniqueUrls, null, 2));
  await writeFile(serviceWorkerPath, source, "utf8");
}

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}
