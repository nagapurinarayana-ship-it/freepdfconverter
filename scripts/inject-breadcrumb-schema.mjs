import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pageLabels, pagePathname } from "./site-config.mjs";

const dist = path.join(process.cwd(), "dist");
const origin = (process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/$/, "");
const START = '<script type="application/ld+json" data-breadcrumb-schema>';
const END = "</script>";

const files = [];
await collectHtml(dist);

for (const file of files) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  if (relative === "index.html") continue;

  let html = await readFile(file, "utf8");
  html = html.replace(
    new RegExp(escapeRegex(START) + "[\\s\\S]*?" + escapeRegex(END), "gi"),
    ""
  );

  const canonical = origin + pagePathname(relative);
  const label = pageLabels[relative] || humanize(relative);

  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: origin + "/"
    }
  ];

  if (relative.startsWith("guides/") && relative !== "guides/index.html") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "PDF Guides",
      item: origin + "/guides"
    });
    items.push({
      "@type": "ListItem",
      position: 3,
      name: label
    });
  } else if (relative.startsWith("tools/")) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "PDF Tools",
      item: origin + "/#tools"
    });
    items.push({
      "@type": "ListItem",
      position: 3,
      name: label
    });
  } else {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: label
    });
  }

  for (const item of items) {
    if (item.position === items.length) delete item.item;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };

  const block = START + JSON.stringify(schema).replace(/</g, "\\u003c") + END;
  if (html.includes("</head>")) {
    html = html.replace("</head>", block + "\n</head>");
    await writeFile(file, html, "utf8");
  }
}

console.log("Injected breadcrumb structured data for indexable non-home pages.");

async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(full);
  }
}

function humanize(relative) {
  return relative
    .replace(/\.html$/, "")
    .split("/")
    .pop()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function escapeRegex(value) {
  return value.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
}
