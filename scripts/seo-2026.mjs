import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const dist = 'dist'
const overrides = {
  'index.html': [
    'Free PDF Converter Online — Merge, Split, Unlock & Convert PDF',
    'Free PDF converter and private browser PDF tools to merge, split, unlock, organize, crop and convert files. No account and supported operations do not upload documents.'
  ],
  'pdf-converter-online.html': [
    'Free PDF Converter Online — Private, No Uploads | FreePDF Tools',
    'Convert and manage PDF files privately in your browser. Merge, split, rotate, unlock, crop, organize and watermark PDFs without uploading supported documents.'
  ],
  'unlock-pdf-online.html': [
    'Unlock PDF Online — Remove a Known Password Without Uploading',
    'Unlock a password-protected PDF when you know the password. Process the document locally in your browser and download an unencrypted copy without uploading the file.'
  ],
  'remove-pdf-metadata-online.html': [
    'Remove PDF Metadata Online — Private Browser Metadata Cleaner',
    'Remove common PDF author, title, subject and keyword metadata in your browser before sharing a new copy. Supported processing stays on your device.'
  ],
  'guides/pdf-converter-without-upload.html': [
    'PDF Converter Without Upload — How Private Browser Processing Works',
    'Learn how to convert and manage PDF files without uploading them to an application server, when local browser processing helps and what its limitations are.'
  ]
}

const files = []
await collect(dist)
for (const file of files) {
  let html = await readFile(file, 'utf8')
  const relative = file.slice(dist.length + 1).replaceAll('\\', '/')

  // Google no longer exposes general FAQ rich results for ordinary utility sites.
  // Keep the visible questions, but remove FAQPage JSON-LD from generated HTML.
  html = html.replace(/<script\s+type=["']application\/ld\+json["']>\s*\{[\s\S]*?["']@type["']\s*:\s*["']FAQPage["'][\s\S]*?<\/script>\s*/gi, '')

  // Google ignores meta keywords; remove build-generated keyword clutter.
  html = html.replace(/\s*<meta\s+name=["']keywords["'][^>]*>/gi, '')

  const override = overrides[relative]
  if (override) {
    const [title, description] = override
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["'][^>]*>/i, `<meta name="description" content="${escapeAttr(description)}">`)
      .replace(/<meta\s+property=["']og:title["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:title" content="${escapeAttr(title)}">`)
      .replace(/<meta\s+property=["']og:description["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta property="og:description" content="${escapeAttr(description)}">`)
      .replace(/<meta\s+name=["']twitter:title["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="twitter:title" content="${escapeAttr(title)}">`)
      .replace(/<meta\s+name=["']twitter:description["'][^>]*content=["'][^"']*["'][^>]*>/i, `<meta name="twitter:description" content="${escapeAttr(description)}">`)
  }

  await writeFile(file, html, 'utf8')
}

console.log(`Applied people-first 2026 SEO cleanup to ${files.length} generated HTML pages.`)

async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) await collect(full)
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full)
  }
}
function escapeAttr(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}
function escapeHtml(value) {
  return escapeAttr(value)
}
