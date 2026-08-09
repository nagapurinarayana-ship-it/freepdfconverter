# FreePDF Tools

Free, privacy-first PDF utilities that run in the browser. Selected documents are processed locally rather than uploaded to an application server.

**Live site:** [freepdfconverter-all-in-one.pages.dev](https://freepdfconverter-all-in-one.pages.dev/)

## Included tools

- Merge PDF
- Split / extract PDF pages
- Rotate PDF pages
- JPG / PNG to PDF
- PDF to JPG / PNG
- Text watermark PDF

The site is static HTML, CSS and JavaScript. PDF processing uses the open-source pdf-lib, Mozilla PDF.js and JSZip browser libraries.

## Recommended free production hosting

Use Cloudflare for the public, monetized site.

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

If you create a Pages project instead:

1. Go to Workers & Pages, then Create, Pages, and Import an existing Git repository.
2. Connect this GitHub repository.
3. Set the production branch to `main`.
4. Set the build command to `npm run build`.
5. Set the build output directory to `dist`.
6. Deploy.

Pages injects `CF_PAGES_URL`; the build uses it to create canonical URLs and `sitemap.xml`. If a custom domain is added later, set a production environment variable named `SITE_ORIGIN` to the full origin, for example `https://example.com`, and redeploy.

## Local checks

Run `npm run verify` to validate local references, metadata, clean canonical URLs, JSON-LD and the generated sitemap. No npm packages are required for these scripts.

## Monetization

See `docs/MONETIZATION.md`. Do not add sample AdSense IDs. Only enable ads with the real publisher and ad-unit IDs after the site is eligible and connected to AdSense.
