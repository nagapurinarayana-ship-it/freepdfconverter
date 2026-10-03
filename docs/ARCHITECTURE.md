# FreePDF Tools Architecture

## Goal

Keep the application maintainable as the number of utilities grows. A small feature change should normally touch one tool module and, when it is a public tool, one registry entry—not a collection of unrelated pages.

## Layers

```
scripts/tool-registry.mjs
        │
        ├── homepage cards
        ├── indexable pages
        ├── SEO keywords / labels
        └── generated sitemap
        │
        ▼
tools/<tool>.html
        │  data-tool="<tool>"
        ▼
assets/js/tool-runtime.js
        │  dynamic module loading
        ▼
assets/js/tools/<tool>.tool.js
        │
        ├── ToolController (shared lifecycle)
        └── core engines (image/PDF/etc.)
```

## Patterns

### Tool Registry
`scripts/tool-registry.mjs` is the single source of truth for public tool metadata. New public tools should be added there.

### Tool Controller
`assets/js/core/tool-controller.js` owns common page lifecycle concerns:

- file selection and drag/drop
- validation and size limits
- busy state
- action/clear button state
- status messages
- progress
- file summary
- reset lifecycle

Tool modules should not duplicate this plumbing.

### Core Engines
Reusable algorithms live under `assets/js/core/`. Image processing is currently centralized in `image-tool-kit.js`. PDF-specific algorithms should follow the same pattern as PDF tools are migrated.

### Tool Modules
Each tool gets one isolated module under `assets/js/tools/`. The runtime dynamically imports the module from the page's `data-tool` value. The runtime itself does not need to be edited when a new tool is added.

## Adding a new tool

1. Add its metadata to `scripts/tool-registry.mjs`.
2. Add `tools/<id>.html` with `data-tool="<id>"`.
3. Add `assets/js/tools/<id>.tool.js`.
4. Reuse `ToolController` and an appropriate core engine.
5. Add tests/contracts when the tool introduces a new engine or format.

The build automatically includes the tool in indexable pages, homepage cards, labels, SEO keywords and sitemap generation.

## Migration rule

Existing legacy tool scripts can continue to work while they are migrated. Do not rewrite working PDF algorithms just to change architecture. Migrate lifecycle/DOM duplication first, then extract reusable processing algorithms.

## Quality rule

A change to one tool must not require copying or editing another tool's controller, status handling, file validation, download code, homepage card, or sitemap entry.
