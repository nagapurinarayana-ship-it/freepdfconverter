import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const dist = 'dist'
const overrides = {
  'index.html': [
    'Free PDF Tools Online — Merge, Split, Compress & Convert | FreePDF Tools',
    'Free online PDF tools to merge, split, compress, convert, sign, OCR and manage documents and images. Supported browser processing keeps source files on your device.'
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
  ],
  'tools/photo-compressor.html': [
    'Compress Images Online Free — Photo Compressor | FreePDF Tools',
    'Compress JPG, PNG and WebP images to practical target sizes such as 20KB, 50KB and 100KB directly in your browser.'
  ],
  'tools/signature-resizer.html': [
    'Resize Signature Online — Free Signature Tool | FreePDF Tools',
    'Resize, clean and compress a signature image for online forms while keeping supported processing in your browser.'
  ],
  'tools/passport-id-photo-maker.html': [
    'Passport & ID Photo Maker — Resize Online | FreePDF Tools',
    'Create passport and ID photos with common dimensions, framing options and file-size limits directly in your browser.'
  ],
  'tools/thumb-impression-resizer.html': [
    'Thumb Impression Resizer — Free Online Tool | FreePDF Tools',
    'Resize and compress thumb-impression images for online forms with custom dimensions, cleanup and file-size limits.'
  ],
  'tools/handwritten-declaration-resizer.html': [
    'Handwritten Declaration Resizer — Free Tool | FreePDF Tools',
    'Resize, trim and compress handwritten declaration images for online forms with custom dimensions and target file sizes.'
  ],
  'tools/ocr-pdf.html': [
    'OCR PDF Online Free — Scanned PDF to Word | FreePDF Tools',
    'OCR scanned PDF files in your browser and download recognized text as Word DOCX or plain text without uploading the source document.'
  ],
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
