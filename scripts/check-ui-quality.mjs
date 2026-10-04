import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "dist");
const failures = [];
const htmlFiles = [];

await collectHtml(dist);

for (const file of htmlFiles) {
  const relative = path.relative(dist, file).replaceAll(path.sep, "/");
  if (relative === "google0982473b0f1ce198.html") continue;

  const html = await readFile(file, "utf8");

  if (!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html)) {
    failures.push(relative + " -> html element is missing a non-empty lang attribute");
  }
  if (!/<meta\s+[^>]*name=["']viewport["'][^>]*>/i.test(html)) {
    failures.push(relative + " -> missing viewport meta");
  }

  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    const tag = match[1];
    if (/\bhref=["']\s*["']/i.test(tag)) {
      failures.push(relative + " -> anchor has an empty href");
      continue;
    }
    const end = html.indexOf("</a>", match.index + match[0].length);
    const body = end >= 0 ? html.slice(match.index + match[0].length, end) : "";
    const label = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!label && !/\b(?:aria-label|title)=["'][^"']+["']/i.test(tag)) {
      failures.push(relative + " -> anchor has no accessible name");
    }
  }

  for (const match of html.matchAll(/<button\b([^>]*)>/gi)) {
    if (!/\btype=["'](?:button|submit|reset)["']/i.test(match[1])) {
      failures.push(relative + " -> button is missing an explicit type");
    }
  }

  for (const match of html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const name = match[1].toLowerCase();
    const tag = match[2];
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";

    if (name === "input" && /^(hidden|button|submit|reset|image)$/.test(type)) continue;
    if (/\baria-label=["'][^"']+["']/i.test(tag) || /\baria-labelledby=["'][^"']+["']/i.test(tag)) continue;

    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    let labelled = false;

    if (id) {
      const escapedId = id.replace(/[.*+?^()|[\]\\]/g, "\\$&");
      labelled = new RegExp('<label\\b[^>]*\\bfor=["\\\']' + escapedId + '["\\\']', "i").test(html);
    }

    if (!labelled && id) {
      const open = html.lastIndexOf("<label", match.index);
      const close = html.lastIndexOf("</label>", match.index);
      labelled = open > close;
    }

    if (!labelled) {
      failures.push(relative + " -> " + name + " control lacks an associated label or ARIA accessible name");
    }
  }

  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(match[1])) {
      failures.push(relative + " -> image is missing alt text");
    }
  }

  for (const match of html.matchAll(/<iframe\b([^>]*)>/gi)) {
    if (!/\btitle=["'][^"']+["']/i.test(match[1])) {
      failures.push(relative + " -> iframe is missing an accessible title");
    }
  }

  if (/(?:onclick|onchange|oninput|onsubmit|onkeydown|onkeyup)=/i.test(html)) {
    failures.push(relative + " -> inline event handler found; use unobtrusive JS instead");
  }

  const idCounts = new Map();
  for (const match of html.matchAll(/\bid=["']([^"']+)["']/gi)) {
    idCounts.set(match[1], (idCounts.get(match[1]) || 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) failures.push(relative + " -> duplicate id: " + id);
  }

  for (const match of html.matchAll(/\btabindex=["']([^"']+)["']/gi)) {
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > 0) {
      failures.push(relative + " -> positive tabindex " + value + " creates a custom focus order");
    }
  }
}

const uniqueFailures = [...new Set(failures)];
if (uniqueFailures.length) {
  console.error("UI quality/accessibility checks failed:\n" + uniqueFailures.join("\n"));
  process.exit(1);
}

console.log("UI quality/accessibility checks passed for " + htmlFiles.length + " HTML pages.");

async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) htmlFiles.push(full);
  }
}
