# FreePDF Tools

Free, privacy-first PDF utilities that run in the browser. Selected documents are processed locally rather than uploaded to an application server.

**Live site:** [freepdfconverter-all-in-one.pages.dev](https://freepdfconverter-all-in-one.pages.dev/)

## Included tools

- Merge PDF
- Split / extract PDF pages
- Unlock password-protected PDFs with a known password
- Rotate PDF pages
- JPG / PNG to PDF
- PDF to JPG / PNG
- Text watermark PDF
- Organize, reorder and delete PDF pages
- Add page numbers to PDF
- Remove common PDF metadata
- Crop PDF pages
- Extract selectable PDF text
- PDF to Word (editable modern `.docx` for text-based PDFs)
- Word / document to PDF: Microsoft Word 97-2003 `.doc` **and** modern `.docx`/`.docm`/`.dotx`/`.dotm`, plus ODT, RTF, TXT and HTML

The site is static HTML, CSS and JavaScript. Word conversion supports both modern Office Open XML documents and legacy Microsoft Word 97-2003 binary `.doc` documents through a browser-side MS-DOC parser. PDF processing uses pinned, self-hosted copies of the open-source pdf-lib, Mozilla PDF.js, JSZip and QPDF WebAssembly libraries. QPDF runs in a dedicated browser worker for the Unlock PDF workflow. A progressive web app service worker caches the public tool code for offline use; selected documents and passwords are never placed in that cache.

## Verify the privacy model

The browser reads selected files through the File API and passes their bytes directly to the local PDF/document libraries. There is no application upload endpoint or server-side conversion job. See the live [technical explanation](https://freepdfconverter-all-in-one.pages.dev/how-local-processing) and inspect `assets/js/` to verify each workflow.

## Recommended free production hosting

Use Cloudflare for the public site.

### Cloudflare Workers Builds

Use these settings when Cloudflare asks for separate build and deploy commands:

1. Connect this GitHub repository.
2. Set the production branch to `main`.
3. Set the build command to `npm run build`.
4. Set the deploy command to `npx wrangler deploy`.
5. Leave the root directory blank.
6. Deploy.

The committed `wrangler.jsonc` uploads only `dist`, so source files, `node_modules` and build tooling are not published as website assets.

Workers Builds does not inject the final public URL into the build. After the first successful deployment, add a build environment variable named `SITE_ORIGIN` containing the full public origin, such as `https://example.workers.dev`, and redeploy. This creates canonical URLs and `sitemap.xml`.

### Cloudflare Pages

Use the native Cloudflare Pages Git integration for production deployment. Keep the production branch as `main`, build command as `npm run build`, and output directory as `dist`. Cloudflare then rebuilds and deploys the site automatically when `main` changes. The repository's GitHub Actions workflow validates the exact production build, including the legacy Microsoft Word 97–2003 parser and modern Word/DOCX workflow, before the change is considered production-ready.

Do not configure a second secret-based Wrangler deployment against the same Pages project unless you intentionally replace the native Git integration.

## Local checks

Run `npm run verify` to validate local references, metadata, clean canonical URLs, JSON-LD and the generated sitemap. The document test validates a real Microsoft Word 97-2003 `.doc` fixture and checks that the modern `.docx` workflow remains enabled.

## Monetization

See `docs/MONETIZATION.md`. Do not add sample AdSense IDs. Only enable ads with the real publisher and ad-unit IDs after the site is eligible and connected to AdSense.
