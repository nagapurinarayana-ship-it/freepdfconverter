# QPDF WebAssembly runtime

This directory contains the browser runtime from
`@neslinesli93/qpdf-wasm` 0.3.0, which embeds QPDF 12.2.0.

- Wrapper source: https://github.com/neslinesli93/qpdf-wasm
- QPDF source: https://github.com/qpdf/qpdf/tree/v12.2.0
- Wrapper licence: ISC (`LICENSE-QPDF-WASM.txt`)
- QPDF licence: Apache-2.0 (`LICENSE-QPDF.txt`)
- QPDF third-party notices: `NOTICE-QPDF.md`

Vendored file SHA-256 values:

```
c0e8fe62e0c3385dd8cb5d6b613f74d87a4138a3a3343e2add45a067a14d0884  qpdf.js
abd933f4ccace4f732999381b21aec8b7e3726f18a5b167fafd57f88dd440876  qpdf.wasm
```

The runtime is self-hosted so the Unlock PDF tool has no paid API,
subscription, remote document-processing service or third-party code-CDN
request.
