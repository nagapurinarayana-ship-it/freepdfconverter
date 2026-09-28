# PDF to Word OCR fallback

The PDF-to-Word workflow uses direct PDF text extraction first. When OCR fallback is enabled, pages with no selectable text are rendered locally and recognized with the self-hosted Tesseract.js English runtime. OCR is not applied to pages that already contain usable text, which keeps normal conversions faster.

Limitations:

- English OCR is the initial fallback language.
- OCR is reconstruction, not pixel-perfect layout preservation.
- Scanned tables, columns, handwriting, low contrast and unusual fonts require review.
- The browser must download the local OCR runtime and language data before recognition begins; the selected document remains in browser memory.
