# Search Console baseline — 9 October 2026

Property: https://freepdfconverter-all-in-one.pages.dev/

Source files supplied on 9 October 2026:
- Coverage export: Coverage-2026-10-09.zip
- Performance on Search export: Performance-on-Search-2026-10-09.zip

## Coverage status in export

The historical chart in the export shows 7 indexed pages from 11 August through 21 September 2026, then 5 indexed pages from 22 September through 4 October. The report lists 2 pages as **Crawled — currently not indexed**, with validation not started.

The export's critical-issues CSV contains only the reason and the count, not the affected URLs. Therefore, the exact pages cannot be identified from this export alone. Use Search Console's page-level indexing details and URL Inspection before attributing the change to a particular page or modifying its canonical or content.

## Performance report scope and limitation

The Performance export is filtered to Web search and **Last 3 months**, with daily chart data through 6 October 2026. It is not a dedicated 28-day comparison export. The values below are export totals, not current live rankings.

### Top page rows

| Page | Clicks | Impressions | CTR | Average position |
|---|---:|---:|---:|---:|
| Home | 2 | 76 | 2.63% | 51.00 |
| Organize PDF | 0 | 688 | 0% | 71.51 |
| PDF vs JPG vs PNG guide | 0 | 166 | 0% | 73.33 |
| How local processing works | 0 | 32 | 0% | 14.59 |
| About | 0 | 15 | 0% | 3.13 |
| Privacy | 0 | 10 | 0% | 2.30 |
| Terms | 0 | 10 | 0% | 3.30 |

Organize PDF remains the most visible recorded tool page but has no clicks in this export. The query cluster includes high-volume organizer terms at low average positions, plus smaller, more promising signals:
- arrange pdf pages online: 11 impressions, average position 2.64
- arrange pages in pdf: 15 impressions, average position 7.13
- pdf page arrange: 15 impressions, average position 9.67

Preserve these query variants when improving the existing organizer page. Do not replace the URL or create near-duplicate organizer pages.

### Countries represented in the export

| Country | Clicks | Impressions | Average position |
|---|---:|---:|---:|
| United States | 0 | 310 | 68.85 |
| Philippines | 0 | 128 | 81.48 |
| India | 1 | 114 | 49.79 |
| United Kingdom | 0 | 70 | 78.63 |
| Malaysia | 0 | 42 | 72.76 |
| Indonesia | 0 | 39 | 80.36 |
| Vietnam | 0 | 29 | 78.41 |
| Bangladesh | 0 | 27 | 81.48 |
| Mexico | 0 | 23 | 80.22 |
| Turkey | 0 | 23 | 82.52 |

Global visibility is already present, especially in the United States and Philippines, but most average positions remain low. Keep globally useful English tool pages and do not pivot the strategy exclusively to India. Prioritize international query clusters by actual impressions, position, tool fit and whether the feature works as promised.

## Newly launched image tools

The image-form tools and image-upload requirements topic were introduced around 5–6 October, close to the end of this Performance export. This report is too early to conclude they are failing to index or not attracting demand. Verify their current URLs with URL Inspection and evaluate them with a later export.

Preserve these URLs and their crawlable internal links:
- /tools/photo-compressor
- /tools/signature-resizer
- /tools/passport-id-photo-maker
- /tools/thumb-impression-resizer
- /tools/handwritten-declaration-resizer
- /topics/image-upload-requirements

## Actions

1. Get the exact two URLs currently reported as crawled but not indexed; inspect indexing status, canonical selected by Google, robots response and rendered content.
2. Verify that the submitted sitemap is fetched successfully and that its URL list matches the live canonical routes.
3. Keep all existing tool, guide, topic and localized URLs; do not delete or consolidate solely due to low impressions.
4. Optimize existing pages for queries already visible in Search Console before creating additional variants.
5. Export the same Performance and Coverage reports after a reasonable crawl period and compare like-for-like time windows.
