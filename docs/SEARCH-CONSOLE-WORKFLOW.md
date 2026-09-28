# Search Console workflow

Export Search Console Performance data as CSV and analyze it locally:

```bash
node scripts/analyze-search-console.mjs path/to/search-console-export.csv
```

The report highlights three actionable groups:

- queries with many impressions but weak click-through rate;
- queries ranking around positions 5–20 where useful content improvements may move a page onto the first results page;
- pages receiving impressions but producing relatively few clicks.

Use the report to improve existing pages before creating new URLs. The site's SEO strategy treats Search Console as the source of observed search intent; keyword tools can supplement it, but they do not replace actual query data.

For privacy, keep exported Search Console data local. The analysis script does not upload the CSV anywhere.
