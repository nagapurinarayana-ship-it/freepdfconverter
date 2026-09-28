import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { SEARCH_INTENT_PATHS, SEARCH_INTENT_PAGES } from "./generate-search-intent-pages.mjs";

const dist = path.join(process.cwd(), "dist");
const failures = [];
const origin = (process.env.SITE_ORIGIN || "https://freepdfconverter-all-in-one.pages.dev").replace(/\/$/, "");

const stripMarkup = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z#0-9]+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

for (const relative of SEARCH_INTENT_PATHS) {
  const file = path.join(dist, relative);
  try {
    await access(file);
  } catch {
    failures.push(relative + " -> generated page missing");
    continue;
  }

  const html = await readFile(file, "utf8");
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim() || "";
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1] || "";
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const h2Count = (html.match(/<h2\b/gi) || []).length;
  const wordCount = stripMarkup(html).split(" ").filter(Boolean).length;
  const expectedPath = relative === "topics/index.html" ? "/topics/" : "/" + relative.replace(/\.html$/, "");

  if (!title) failures.push(relative + " -> missing title");
  if (!description) failures.push(relative + " -> missing description");
  if (h1Count !== 1) failures.push(relative + " -> expected exactly one H1");
  if (h2Count < 3) failures.push(relative + " -> insufficient content sections");
  if (wordCount < 300) failures.push(relative + " -> content is too thin (" + wordCount + " words)");
  if (canonical !== origin + expectedPath) failures.push(relative + " -> canonical mismatch");
  if (!html.includes('"@type":"WebPage"')) failures.push(relative + " -> missing WebPage structured data");
  const internalLinks = [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href.startsWith("/"));
  if (internalLinks.length < (relative === "topics/index.html" ? 10 : 3)) failures.push(relative + " -> insufficient crawlable internal links");
  if (!html.includes("freepdf-topic")) failures.push(relative + " -> missing topic page context marker");

  const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
  if (!sitemap.includes("<loc>" + origin + expectedPath + "</loc>")) failures.push(relative + " -> missing from sitemap");
}

if (Object.keys(SEARCH_INTENT_PAGES).length !== SEARCH_INTENT_PATHS.length) {
  failures.push("generator manifest/path count mismatch");
}

const titles = new Map();
for (const relative of SEARCH_INTENT_PATHS) {
  const html = await readFile(path.join(dist, relative), "utf8");
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "";
  if (titles.has(title)) failures.push(relative + " -> duplicate title with " + titles.get(title));
  titles.set(title, relative);
}

if (failures.length) {
  console.error("Search-intent content checks failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Search-intent content checks passed for " + SEARCH_INTENT_PATHS.length + " pages.");