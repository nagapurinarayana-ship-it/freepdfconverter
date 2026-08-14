import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const site = 'https://freepdfconverter-all-in-one.pages.dev';
const skip = new Set(['404.html', 'google0982473b0f1ce198.html']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function canonicalFor(file) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  if (rel === 'index.html') return `${site}/`;
  return `${site}/${rel}`;
}

let changed = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  if (skip.has(rel)) continue;

  let html = fs.readFileSync(file, 'utf8');
  const canonical = canonicalFor(file);
  const canonicalTag = `<link rel="canonical" href="${canonical}">`;
  const canonicalRe = /<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*\/?>/i;
  if (canonicalRe.test(html)) html = html.replace(canonicalRe, canonicalTag);
  else if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) html = html.replace(/(<meta\s+name=["']description["'][^>]*>)/i, `$1${canonicalTag}`);
  else html = html.replace(/<\/head>/i, `${canonicalTag}</head>`);

  const robotsTag = '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">';
  const robotsRe = /<meta\s+name=["']robots["'][^>]*>/i;
  if (robotsRe.test(html)) html = html.replace(robotsRe, robotsTag);
  else html = html.replace(/<\/head>/i, `${robotsTag}</head>`);

  if (html !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, html);
    changed++;
  }
}

console.log(`SEO normalization complete: ${changed} HTML files updated.`);
