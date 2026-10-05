import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const htmlFiles = [];
await collectHtml(dist);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  let normalized = normalizeInternalLinks(html);
  normalized = normalizeGlobalHeader(normalized, relative);
  normalized = ensureHeaderVisibilityStyles(normalized);

  if (normalized !== html) await writeFile(file, normalized, "utf8");
}

console.log("Normalized internal HTML links, the shared production header, and header visibility.");

function normalizeInternalLinks(html) {
  return html.replace(/(href=["'])([^"']+)(["'])/gi, function (full, prefix, href, suffix) {
    if (/^(?:https?:|mailto:|tel:|data:|#|javascript:)/i.test(href)) return full;

    const suffixIndex = href.search(/[?#]/);
    const pathPart = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
    const trailing = suffixIndex === -1 ? "" : href.slice(suffixIndex);

    if (!/\.html$/i.test(pathPart)) return full;

    let clean = pathPart.slice(0, -5);
    if (clean === "index") clean = "./";
    else if (clean.endsWith("/index")) clean = clean.slice(0, -5) || "./";

    return prefix + clean + trailing + suffix;
  });
}

function normalizeGlobalHeader(html, relative) {
  const current = relative === "index.html" || relative.startsWith("tools/")
    ? "all"
    : relative.startsWith("guides/")
      ? "guides"
      : relative.startsWith("topics/")
        ? "topics"
        : relative === "privacy.html"
          ? "privacy"
          : relative === "about.html"
            ? "about"
            : "";

  const links = [
    ["all", "/#tools", "All tools"],
    ["guides", "/guides/", "Guides"],
    ["topics", "/topics/", "Topics"],
    ["privacy", "/privacy", "Privacy"],
    ["about", "/about", "About"]
  ];

  const nav = links.map(function (item) {
    const aria = current === item[0] ? ' aria-current="page"' : "";
    return '<a href="' + item[1] + '"' + aria + '>' + item[2] + '</a>';
  }).join("");

  const header = '<header class="site-header"><div class="container header-inner">' +
    '<a class="logo" href="/" aria-label="FreePDF Tools home"><span class="logo-mark" aria-hidden="true">PDF</span><span>FreePDF Tools</span></a>' +
    '<nav class="main-nav" aria-label="Main navigation">' + nav + '</nav>' +
    '</div></header>';

  return html.replace(/<header\s+class=["']site-header["'][\s\S]*?<\/header>/i, header);
}

function ensureHeaderVisibilityStyles(html) {
  const href = "/assets/css/header-stability.css";
  if (new RegExp("<link[^>]+href=[\\\"']" + escapeRegExp(href) + "[\\\"']", "i").test(html)) return html;

  const link = '<link rel="stylesheet" href="' + href + '">';
  const stylesHref = /<link[^>]+href=["'][^"']*assets\/css\/styles(?:\.[a-f0-9]{10})?\.css["'][^>]*>/i;
  if (stylesHref.test(html)) return html.replace(stylesHref, function (match) { return match + link; });
  return html.replace("</head>", link + "\n</head>");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) htmlFiles.push(full);
  }
}
