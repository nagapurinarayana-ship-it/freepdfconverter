import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const site = 'https://freepdfconverter-all-in-one.pages.dev';
const socialImage = `${site}/assets/images/freepdf-tools-social.jpg`;
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
  if (rel.endsWith('/index.html')) return `${site}/${rel.slice(0, -'index.html'.length)}`;
  if (rel.endsWith('.html')) return `${site}/${rel.slice(0, -'.html'.length)}`;
  return `${site}/${rel}`;
}

function routeKind(rel) {
  if (rel.startsWith('tools/')) return 'tool';
  if (rel.startsWith('guides/') && rel !== 'guides/index.html') return 'guide';
  return 'page';
}

function getTitle(html) {
  return decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'FreePDF Tools');
}

function getDescription(html) {
  return decodeHtml(html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/i)?.[1]?.trim() || 'Free private browser-based PDF tools that process documents locally on your device.');
}

function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function metaPattern(attribute, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${escaped}["'][^>]*>`, 'gi');
}

function removeMeta(html, attribute, key) {
  const pattern = metaPattern(attribute, key);
  return html.replace(new RegExp(`\\s*${pattern.source}`, 'gi'), '');
}

function setMeta(html, attribute, key, content) {
  const expected = escapeHtml(content);
  const tags = html.match(metaPattern(attribute, key)) || [];
  const existing = tags.length === 1 ? tags[0].match(/\bcontent=["']([^"']*)["']/i)?.[1] : null;
  if (tags.length === 1 && existing === expected) return html;
  html = removeMeta(html, attribute, key);
  return html.replace(/<\/head>/i, `<meta ${attribute}="${key}" content="${expected}">\n</head>`);
}

function setCanonical(html, canonical) {
  const pattern = /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi;
  const tags = html.match(pattern) || [];
  const existing = tags.length === 1 ? tags[0].match(/\bhref=["']([^"']*)["']/i)?.[1] : null;
  if (tags.length === 1 && existing === canonical) return html;
  html = html.replace(/\s*<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');
  return html.replace(/<\/head>/i, `<link rel="canonical" href="${canonical}">\n</head>`);
}

function rewriteInternalHtmlLinks(html) {
  return html.replace(/href=(["'])([^"']*?)\.html([?#][^"']*)?\1/gi, (match, quote, target, suffix = '') => {
    if (/^(?:https?:|mailto:|tel:|javascript:|data:|#)/i.test(target)) return match;
    let clean = target;
    if (clean.endsWith('/index')) clean = clean.slice(0, -'index'.length);
    else if (clean === 'index') clean = './';
    return `href=${quote}${clean}${suffix}${quote}`;
  });
}

function removeFaqSchema(html) {
  const pattern = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>\s*/gi;
  return html.replace(pattern, (full, raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.['@type'] === 'FAQPage') return '';
      if (Array.isArray(parsed?.['@graph'])) {
        const graph = parsed['@graph'].filter(item => item?.['@type'] !== 'FAQPage');
        if (graph.length !== parsed['@graph'].length) {
          if (!graph.length) return '';
          return `<script type="application/ld+json">${JSON.stringify({ ...parsed, '@graph': graph })}</script>\n`;
        }
      }
    } catch (_) {
      // Keep unknown JSON-LD. The strict audit reports malformed structured data.
    }
    return full;
  });
}

function hasSchemaType(html, type) {
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.['@type'] === type) return true;
      if (Array.isArray(parsed?.['@graph']) && parsed['@graph'].some(item => item?.['@type'] === type)) return true;
    } catch (_) {}
  }
  return false;
}

function appendSchema(html, schema) {
  return html.replace(/<\/head>/i, `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`);
}

let changed = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  if (skip.has(rel)) continue;

  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  const canonical = canonicalFor(file);
  const title = getTitle(html);
  const description = getDescription(html);
  const kind = routeKind(rel);

  html = setCanonical(html, canonical);
  html = setMeta(html, 'name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  html = setMeta(html, 'property', 'og:type', kind === 'guide' ? 'article' : 'website');
  html = setMeta(html, 'property', 'og:site_name', 'FreePDF Tools');
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'property', 'og:image', socialImage);
  html = setMeta(html, 'property', 'og:image:alt', 'FreePDF Tools — private browser-based PDF utilities');
  html = setMeta(html, 'property', 'og:image:width', '1200');
  html = setMeta(html, 'property', 'og:image:height', '630');
  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', socialImage);
  html = setMeta(html, 'name', 'twitter:image:alt', 'FreePDF Tools — private browser-based PDF utilities');

  html = removeFaqSchema(html);
  if (!hasSchemaType(html, 'WebPage')) {
    html = appendSchema(html, {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: canonical,
      image: socialImage,
      isPartOf: { '@type': 'WebSite', name: 'FreePDF Tools', url: `${site}/` },
      inLanguage: 'en'
    });
  }
  if (kind === 'tool' && !hasSchemaType(html, 'WebApplication')) {
    html = appendSchema(html, {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: title,
      description,
      url: canonical,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web browser',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    });
  }
  if (kind === 'guide' && !hasSchemaType(html, 'Article')) {
    html = appendSchema(html, {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      url: canonical,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      author: { '@type': 'Organization', name: 'FreePDF Tools', url: `${site}/about` },
      publisher: { '@type': 'Organization', name: 'FreePDF Tools', url: `${site}/about` },
      image: socialImage,
      inLanguage: 'en'
    });
  }

  html = rewriteInternalHtmlLinks(html);

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed++;
  }
}

console.log(`SEO normalization complete: ${changed} HTML files updated.`);
