# FreePDF Tools

Free, privacy-first PDF utilities that run in the browser. Selected documents are processed locally rather than uploaded to an application server.

## Included tools

- Merge PDF
- Split / extract PDF pages
- Rotate PDF pages
- JPG / PNG to PDF
- PDF to JPG / PNG
- Text watermark PDF

The site is static HTML, CSS and JavaScript. PDF processing uses the open-source pdf-lib, Mozilla PDF.js and JSZip browser libraries.

## Recommended free production hosting

Use Cloudflare Pages for the public, monetized site.

1. Create a free Cloudflare account.
2. Go to Workers & Pages, then Create, Pages, and Import an existing Git repository.
3. Connect this GitHub repository.
4. Set production branch to main.
5. Set build command to: npm run build
6. Set build output directory to: dist
7. Deploy.

Cloudflare injects CF_PAGES_URL; the build uses it to create canonical URLs and sitemap.xml. If a custom domain is added later, set a production environment variable named SITE_ORIGIN to the full origin, for example https://example.com, and redeploy.

## Local checks

Run npm run check and npm run build. No npm packages are required for these scripts.

## Monetization

See docs/MONETIZATION.md. Do not add sample AdSense IDs. Only enable ads with the real publisher and ad-unit IDs after the site is eligible and connected to AdSense.
