import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "dist", "guides", "reduce-pdf-file-size-for-email.html");
const START = "<!-- freepdf-guide-links:start -->";
const END = "<!-- freepdf-guide-links:end -->";
const block = `${START}\n<section class="section related-guides" aria-labelledby="related-guides-title"><div class="container content-narrow"><h2 id="related-guides-title">Related PDF guides</h2><p>Explore related PDF tasks and privacy guidance.</p><ul class="footer-links related-guide-list"><li><a href="compress-pdf">Compress PDF file size</a></li><li><a href="split-extract-pdf-pages">Split and extract PDF pages</a></li><li><a href="organize-pdf-pages">Organize PDF pages</a></li><li><a href="pdf-converter-without-upload">Convert PDFs without uploading files</a></li></ul></div></section>\n${END}`;

let html = await readFile(file, "utf8");
html = html.replace(new RegExp(`${escapeRegex(START)}[\\s\\S]*?${escapeRegex(END)}`, "g"), "");
html = html.replace("</main>", `${block}\n</main>`);
await writeFile(file, html, "utf8");
console.log("Added related guide links to the email-size PDF guide.");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}
