(() => {
  "use strict";

  const MAX_SINGLE_FILE_BYTES = 60 * 1024 * 1024; // 60 MB per image
  const MAX_TOTAL_FILE_BYTES = 120 * 1024 * 1024; // 120 MB total
  const MAX_DIMENSION = 3000; // downscale very large images to this max dimension

  const elements = {
    dropZone: document.getElementById("jpgDropZone"),
    fileInput: document.getElementById("imageFiles"),
    fileList: document.getElementById("imageList"),
    fileCount: document.getElementById("imageCount"),
    convertButton: document.getElementById("convertButton"),
    clearButton: document.getElementById("jpgClearButton"),
    progressBar: document.getElementById("jpgProgressBar"),
    status: document.getElementById("jpgToolStatus"),
    filenameInput: document.getElementById("outputFilename"),
    pageSizeSelect: document.getElementById("pageSize")
  };

  let selectedImages = [];
  let processing = false;

  function setStatus(message, type = "info") {
    elements.status.textContent = message;
    elements.status.dataset.type = type;
  }

  function setProgress(pct) {
    const n = Math.max(0, Math.min(100, Number(pct) || 0));
    elements.progressBar.style.width = `${n}%`;
  }

  function setProcessing(v) {
    processing = Boolean(v);
    elements.fileInput.disabled = processing;
    elements.convertButton.disabled = processing || selectedImages.length === 0;
    elements.clearButton.disabled = processing || selectedImages.length === 0;
    renderFileList();
  }

  function updateButtonState() {
    elements.fileCount.textContent = `${selectedImages.length} ${selectedImages.length === 1 ? 'image' : 'images'} selected`;
    elements.convertButton.disabled = processing || selectedImages.length === 0;
    elements.clearButton.disabled = processing || selectedImages.length === 0;
  }

  function isImageFile(file) {
    if (!(file instanceof File)) return false;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    const typeOk = allowed.includes(file.type);
    const extOk = /\.(jpe?g|png)$/i.test(file.name);
    return typeOk || extOk;
  }

  function addFiles(collection) {
    const incoming = Array.from(collection || []);
    if (!incoming.length) return;

    const invalid = incoming.find(f => !isImageFile(f));
    if (invalid) {
      setStatus(`\"${invalid.name}\" is not a supported image (JPG/PNG).`, 'error');
      elements.fileInput.value = '';
      return;
    }

    const oversized = incoming.find(f => f.size > MAX_SINGLE_FILE_BYTES);
    if (oversized) {
      setStatus(`\"${oversized.name}\" is larger than 60 MB.`, 'error');
      elements.fileInput.value = '';
      return;
    }

    const combined = [...selectedImages.map(s => s.file), ...incoming];
    const total = combined.reduce((t, f) => t + Number(f.size || 0), 0);
    if (total > MAX_TOTAL_FILE_BYTES) {
      setStatus(`Selected images total ${window.FreePDFTools.formatBytes(total)} — keep total below 120 MB.`, 'error');
      elements.fileInput.value = '';
      return;
    }

    incoming.forEach(file => {
      // create a short-lived object URL for a thumbnail preview
      const previewUrl = URL.createObjectURL(file);
      selectedImages.push({ id: window.FreePDFTools.createId(), file, previewUrl });
    });

    elements.fileInput.value = '';
    renderFileList();
    updateButtonState();
    setProgress(0);
    setStatus(`${selectedImages.length} images ready.`, 'success');
  }

  function renderFileList() {
    elements.fileList.innerHTML = '';
    selectedImages.forEach((entry, idx) => {
      const li = document.createElement('li');
      li.className = 'file-row';
      li.dataset.fileId = entry.id;

      const thumb = document.createElement('img');
      thumb.className = 'file-thumb';
      thumb.alt = entry.file.name;
      thumb.src = entry.previewUrl || '';
      // inline styles for a consistent thumbnail appearance
      thumb.style.width = '56px';
      thumb.style.height = '56px';
      thumb.style.objectFit = 'cover';
      thumb.style.borderRadius = '9px';
      thumb.style.marginRight = '12px';
      thumb.loading = 'lazy';

      const pos = document.createElement('span');
      pos.className = 'file-position';
      pos.textContent = String(idx + 1);

      const info = document.createElement('div');
      info.className = 'file-information';
      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = entry.file.name;
      const size = document.createElement('span');
      size.className = 'file-size';
      size.textContent = window.FreePDFTools.formatBytes(entry.file.size);
      info.append(name, size);

      const controls = document.createElement('div');
      controls.className = 'file-controls';

      const up = createFileControlButton({ symbol: '↑', action: 'move-up', label: `Move ${entry.file.name} up`, disabled: processing || idx === 0 });
      const down = createFileControlButton({ symbol: '↓', action: 'move-down', label: `Move ${entry.file.name} down`, disabled: processing || idx === selectedImages.length - 1 });
      const remove = createFileControlButton({ symbol: '×', action: 'remove', label: `Remove ${entry.file.name}`, disabled: processing, extraClass: 'remove' });

      controls.append(up, down, remove);

      // Assemble row: thumbnail, info, controls.
      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.append(thumb, info);

      li.append(left, controls);
      elements.fileList.appendChild(li);
    });
  }

  function createFileControlButton(options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `file-control-button ${options.extraClass || ''}`.trim();
    btn.textContent = options.symbol;
    btn.dataset.action = options.action;
    btn.setAttribute('aria-label', options.label);
    btn.disabled = Boolean(options.disabled);
    return btn;
  }

  elements.fileList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || processing) return;
    const row = btn.closest('[data-file-id]');
    if (!row) return;
    const idx = selectedImages.findIndex(s => s.id === row.dataset.fileId);
    if (idx < 0) return;
    const action = btn.dataset.action;
    if (action === 'move-up') moveImage(idx, idx - 1);
    if (action === 'move-down') moveImage(idx, idx + 1);
    if (action === 'remove') {
      // revoke object URL for removed preview
      const removed = selectedImages.splice(idx, 1)[0];
      if (removed && removed.previewUrl) {
        try { URL.revokeObjectURL(removed.previewUrl); } catch (e) { /* ignore */ }
      }
      renderFileList();
      updateButtonState();
      setStatus(selectedImages.length ? 'Image removed.' : 'No images selected.', selectedImages.length ? 'success' : 'info');
    }
  });

  function moveImage(from, to) {
    if (from < 0 || to < 0 || from >= selectedImages.length || to >= selectedImages.length) return;
    const [item] = selectedImages.splice(from, 1);
    selectedImages.splice(to, 0, item);
    renderFileList(); updateButtonState(); setStatus('Order updated.', 'success');
  }

  elements.fileInput.addEventListener('change', () => addFiles(elements.fileInput.files));

  ['dragenter','dragover'].forEach(ev => elements.dropZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); elements.dropZone.classList.add('is-dragging'); }));
  ['dragleave','drop'].forEach(ev => elements.dropZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); elements.dropZone.classList.remove('is-dragging'); }));
  elements.dropZone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

  function clearImages() {
    if (processing) return;
    // revoke all preview URLs
    selectedImages.forEach(entry => {
      if (entry.previewUrl) {
        try { URL.revokeObjectURL(entry.previewUrl); } catch (e) { /* ignore */ }
      }
    });

    selectedImages = [];
    elements.fileInput.value = '';
    renderFileList(); updateButtonState(); setProgress(0); setStatus('Choose images to convert.', 'info');
  }

  elements.clearButton.addEventListener('click', clearImages);

  async function imageFileToArrayBufferScaled(file) {
    // Load image via createImageBitmap when available for better performance
    const blobUrl = URL.createObjectURL(file);
    try {
      const img = await createImageBitmap(file);
      let { width, height } = img;
      let scale = 1;
      if (Math.max(width, height) > MAX_DIMENSION) {
        scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = new OffscreenCanvas ? new OffscreenCanvas(width, height) : document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // blob from canvas
      const blob = await new Promise((resolve) => canvas.convertToBlob ? canvas.convertToBlob({ type: file.type, quality: 0.92 }).then(resolve) : canvas.toBlob(resolve, file.type, 0.92));
      const arrayBuffer = await blob.arrayBuffer();
      return { arrayBuffer, width, height, type: file.type };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  async function convertImagesToPdf() {
    if (processing || selectedImages.length === 0) return;
    if (!window.PDFLib || !window.PDFLib.PDFDocument) { setStatus('PDF library failed to load.', 'error'); return; }

    setProcessing(true); setProgress(2); setStatus('Creating PDF…', 'info');

    try {
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.create();
      const total = selectedImages.length;

      // Page size presets (points): A4 ~ 595x842, Letter ~612x792
      const pageSize = elements.pageSizeSelect.value || 'A4';
      const PAGE_SIZES = {
        'A4': { width: 595, height: 842 },
        'Letter': { width: 612, height: 792 },
        'Fit': null // fit to image
      };

      for (let i = 0; i < total; i += 1) {
        const file = selectedImages[i].file;
        setStatus(`Processing ${i+1} of ${total}: ${file.name}`, 'info');
        // get possibly scaled image bytes
        const { arrayBuffer, width, height, type } = await imageFileToArrayBufferScaled(file);

        let embeddedImage;
        if (/png/i.test(type)) {
          embeddedImage = await pdfDoc.embedPng(arrayBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        }

        // determine page size and image placement
        let pageWidth, pageHeight;
        if (PAGE_SIZES[pageSize]) {
          pageWidth = PAGE_SIZES[pageSize].width;
          pageHeight = PAGE_SIZES[pageSize].height;

          // scale to fit while preserving aspect ratio
          const imgWidth = embeddedImage.width;
          const imgHeight = embeddedImage.height;
          const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight, 1);
          const drawWidth = imgWidth * scale;
          const drawHeight = imgHeight * scale;
          const x = (pageWidth - drawWidth) / 2;
          const y = (pageHeight - drawHeight) / 2;

          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          page.drawImage(embeddedImage, { x, y, width: drawWidth, height: drawHeight });
        } else {
          // Fit: make page the image pixel dims scaled to 72dpi roughly
          // convert pixels to points: assume 96dpi -> points = px * 72/96 = px * 0.75
          const pxToPt = 0.75;
          pageWidth = Math.max(200, Math.round(width * pxToPt));
          pageHeight = Math.max(200, Math.round(height * pxToPt));
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          page.drawImage(embeddedImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
        }

        const pct = Math.round(((i + 1) / total) * 92);
        setProgress(pct);
      }

      setStatus('Saving PDF…', 'info');
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      setProgress(98);

      const outBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const base = window.FreePDFTools.getSafeBaseName(elements.filenameInput.value || 'images');
      const outputName = `${base}.pdf`;

      window.FreePDFTools.downloadBlob(outBlob, outputName);
      setProgress(100);
      setStatus(`PDF created: ${outputName}`, 'success');
    } catch (err) {
      console.error('Conversion failed:', err);
      setStatus('Could not create PDF. Try smaller images or fewer files.', 'error');
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }

  elements.convertButton.addEventListener('click', convertImagesToPdf);

  // initialize
  renderFileList(); updateButtonState(); setProgress(0); setStatus('Choose JPG or PNG images to convert.', 'info');
})();
