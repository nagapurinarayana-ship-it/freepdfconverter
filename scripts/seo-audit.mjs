import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://freepdfconverter-all-in-one.pages.dev';
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
let failed = false;
const titles = new Map();

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function count(source, regex) {
  return [...source.matchAll(regex)].length;
}

function localFileFor(url) {
  const pathname = new URL(url).pathname;
  if (pathname === '/') return 'index.html';
  const clean = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (pathname.endsWith('/')) return `${clean}/index.html`;
  const htmlFile = `${clean}.html`;
  if (fs.existsSync(htmlFile)) return htmlFile;
  return `${clean}/index.html`;
}

function schemaTypes(html, file) {
  const types = [];
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.['@type']) types.push(parsed['@type']);
      if (Array.isArray(parsed?.['@graph'])) {
        for (const item of parsed['@graph']) if (item?.['@type']) types.push(item['@type']);
      }
    } catch (error) {
      fail(`${file}: invalid JSON-LD (${error.message})`);
    }
  }
  return types;
}

if (!urls.length) fail('sitemap.xml has no URLs');
if (new Set(urls).size !== urls.length) fail('sitemap.xml contains duplicate URLs');
if (urls.some(url => !url.startsWith(`${SITE}/`))) fail('sitemap contains URLs outside the production origin');
if (urls.some(url => /\.html(?:$|[?#])/.test(url))) fail('sitemap must use clean extensionless URLs');

for (const url of urls) {
  const file = localFileFor(url);
  if (!fs.existsSync(file)) {
    fail(`${url}: missing local page ${file}`);
    continue;
  }

  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const description = html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() || '';
  const canonical = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1] || '';
  const robots = html.match(/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i)?.[1] || '';

  if (!title) fail(`${file}: missing title`);
  if (!description) fail(`${file}: missing meta description`);
  if (canonical !== url) fail(`${file}: canonical mismatch; expected ${url}, got ${canonical || '(missing)'}`);
  if (/\.html(?:$|[?#])/.test(canonical)) fail(`${file}: canonical must not use .html`);
  if (!/index/i.test(robots) || !/follow/i.test(robots)) fail(`${file}: page must be index,follow`);
  if (!/max-image-preview:large/i.test(robots)) fail(`${file}: page must allow large image previews`);
  if (count(html, /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi) !== 1) fail(`${file}: expected exactly one canonical`);
  if (count(html, /<h1\b/gi) !== 1) fail(`${file}: expected exactly one H1`);

  for (const marker of [
    /<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/i,
    /<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/i,
    /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i,
    /<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/i,
    /<meta\b[^>]*\bname=["']twitter:card["'][^>]*>/i,
    /<meta\b[^>]*\bname=["']twitter:image["'][^>]*>/i,
  ]) {
    if (!marker.test(html)) fail(`${file}: incomplete social/search preview metadata`);
  }

  const types = schemaTypes(html, file);
  if (!types.includes('WebPage')) fail(`${file}: missing WebPage structured data`);
  if (file.startsWith(`tools${path.sep}`) && !types.includes('WebApplication')) fail(`${file}: tool page missing WebApplication structured data`);
  if (file.startsWith(`guides${path.sep}`) && file !== `guides${path.sep}index.html` && !types.includes('Article')) fail(`${file}: guide page missing Article structured data`);
  if (types.includes('FAQPage')) fail(`${file}: unsupported FAQPage structured data should not be emitted`);

  if (/<meta\b[^>]*\bname=["']keywords["']/i.test(html)) fail(`${file}: obsolete meta keywords found`);
  if (/href=["'](?!https?:|mailto:|tel:|#)[^"']*\.html(?:[?#][^"']*)?["']/i.test(html)) fail(`${file}: local internal link still points to a .html duplicate`);

  if (titles.has(title)) fail(`${file}: duplicate title also used by ${titles.get(title)}`);
  else titles.set(title, file);

  console.log(`PASS ${file}`);
}

const robotsTxt = fs.readFileSync('robots.txt', 'utf8');
if (!/User-agent:\s*\*/i.test(robotsTxt) || !/Allow:\s*\//i.test(robotsTxt)) fail('robots.txt must allow public crawling');
if (!robotsTxt.includes(`Sitemap: ${SITE}/sitemap.xml`)) fail('robots.txt must reference the exact production sitemap');

if (failed) process.exit(1);
console.log(`FreePDF SEO audit passed for ${urls.length} indexable pages.`);
