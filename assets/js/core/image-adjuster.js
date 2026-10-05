export function createImageAdjuster({ container, aspectRatio = 1, label = "Image framing", instructions = "Drag to move · pinch or wheel to zoom", guideType = "generic", onChange: initialOnChange = () => {} }) {
  if (!container) throw new Error("Missing image-adjuster container.");
  const root = document.createElement("div");
  root.className = "image-adjuster";
  root.dataset.guideType = guideType;
  root.innerHTML = `
    <div class="image-adjuster-toolbar">
      <strong class="image-adjuster-title"></strong>
      <span class="image-adjuster-help"></span>
      <div class="image-adjuster-nav" data-image-adjuster-nav></div>
    </div>
    <div class="image-adjuster-viewport" role="img" aria-label="Adjust the selected image framing">
      <div class="image-adjuster-checker"></div>
      <img class="image-adjuster-image" alt="" draggable="false">
      <div class="image-adjuster-guide" aria-hidden="true"></div>
    </div>
    <div class="image-adjuster-controls">
      <button type="button" class="button secondary" data-adjuster-reset>Reset</button>
      <div class="image-adjuster-zoom">
        <button type="button" class="button secondary" data-adjuster-zoom-out aria-label="Zoom out">−</button>
        <output data-adjuster-zoom-value aria-live="polite">100%</output>
        <button type="button" class="button secondary" data-adjuster-zoom-in aria-label="Zoom in">+</button>
      </div>
    </div>
    <p class="image-adjuster-status" data-adjuster-status role="status" aria-live="polite"></p>`;
  container.replaceChildren(root);

  const viewport = root.querySelector(".image-adjuster-viewport");
  const image = root.querySelector(".image-adjuster-image");
  const title = root.querySelector(".image-adjuster-title");
  const help = root.querySelector(".image-adjuster-help");
  const nav = root.querySelector("[data-image-adjuster-nav]");
  const resetButton = root.querySelector("[data-adjuster-reset]");
  const zoomOut = root.querySelector("[data-adjuster-zoom-out]");
  const zoomIn = root.querySelector("[data-adjuster-zoom-in]");
  const zoomValue = root.querySelector("[data-adjuster-zoom-value]");
  const status = root.querySelector("[data-adjuster-status]");

  title.textContent = label;
  help.textContent = instructions;
  let onChange = initialOnChange;
  let source = null;
  let suggested = null;
  let crop = null;
  let ratio = Math.max(0.05, Number(aspectRatio) || 1);
  let imageWidth = 0;
  let imageHeight = 0;
  let scale = 1;
  let minScale = 1;
  let maxScale = 8;
  let tx = 0;
  let ty = 0;
  let pointers = new Map();
  let drag = null;
  let pinch = null;
  let observer = null;
  let destroyed = false;

  image.style.transformOrigin = "0 0";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const stage = () => ({ width: Math.max(1, viewport.clientWidth), height: Math.max(1, viewport.clientHeight) });

  function constrain() {
    const s = stage();
    const w = imageWidth * scale;
    const h = imageHeight * scale;
    tx = w <= s.width ? (s.width - w) / 2 : clamp(tx, s.width - w, 0);
    ty = h <= s.height ? (s.height - h) / 2 : clamp(ty, s.height - h, 0);
  }

  // Derive the export crop from the actual rendered intersection of the
  // image and viewport. This makes the exported crop exactly match what the
  // user can see, independent of CSS transform order, device-pixel ratio,
  // fractional zoom, or responsive viewport sizing.
  function getCropRect() {
    if (!source) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const renderedWidth = Math.max(1e-6, imageRect.width);
    const renderedHeight = Math.max(1e-6, imageRect.height);
    const sourceScaleX = renderedWidth / Math.max(1, imageWidth);
    const sourceScaleY = renderedHeight / Math.max(1, imageHeight);

    const left = Math.max(viewportRect.left, imageRect.left);
    const top = Math.max(viewportRect.top, imageRect.top);
    const right = Math.min(viewportRect.right, imageRect.right);
    const bottom = Math.min(viewportRect.bottom, imageRect.bottom);

    const visibleWidth = Math.max(1, right - left);
    const visibleHeight = Math.max(1, bottom - top);
    const x = clamp(
      (left - imageRect.left) / sourceScaleX,
      0,
      Math.max(0, imageWidth - 1)
    );
    const y = clamp(
      (top - imageRect.top) / sourceScaleY,
      0,
      Math.max(0, imageHeight - 1)
    );
    const width = clamp(
      visibleWidth / sourceScaleX,
      1,
      Math.max(1, imageWidth - x)
    );
    const height = clamp(
      visibleHeight / sourceScaleY,
      1,
      Math.max(1, imageHeight - y)
    );

    return { x, y, width, height };
  }

  function notify() {
    crop = getCropRect();
    if (crop) onChange({ ...crop });
  }

  function render() {
    image.style.width = imageWidth + "px";
    image.style.height = imageHeight + "px";
    image.style.transform = "translate3d(" + tx + "px," + ty + "px,0) scale(" + scale + ")";
    zoomValue.textContent = Math.round((scale / minScale) * 100) + "%";
    status.textContent = "Adjust the framing until all important content is inside the frame.";
    notify();
  }

  function applyCrop(rect) {
    if (!source) return;
    const s = stage();
    let width = Math.max(1, Math.min(imageWidth, Number(rect?.width) || imageHeight * ratio));
    let height = Math.max(1, Math.min(imageHeight, Number(rect?.height) || width / ratio));
    if ((width / height) > ratio) width = Math.min(width, height * ratio);
    else height = Math.min(height, width / ratio);
    const rx = Number(rect?.x);
    const ry = Number(rect?.y);
    const x = clamp(Number.isFinite(rx) ? rx : (imageWidth - width) / 2, 0, Math.max(0, imageWidth - width));
    const y = clamp(Number.isFinite(ry) ? ry : (imageHeight - height) / 2, 0, Math.max(0, imageHeight - height));
    minScale = Math.max(s.width / imageWidth, s.height / imageHeight);
    maxScale = Math.max(minScale * 8, minScale + 0.01);
    scale = clamp(Math.max(s.width / width, s.height / height), minScale, maxScale);
    tx = s.width / 2 - (x + width / 2) * scale;
    ty = s.height / 2 - (y + height / 2) * scale;
    constrain();
    render();
  }

  function reset() { applyCrop(suggested || { x: 0, y: 0, width: imageWidth, height: imageHeight }); }

  function zoomAt(factor, focalX = stage().width / 2, focalY = stage().height / 2) {
    if (!source) return;
    const sx = (focalX - tx) / scale;
    const sy = (focalY - ty) / scale;
    scale = clamp(scale * factor, minScale, maxScale);
    tx = focalX - sx * scale;
    ty = focalY - sy * scale;
    constrain();
    render();
  }

  function distance(a,b) { return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY); }
  function center(a,b) {
    const r = viewport.getBoundingClientRect();
    return {x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top};
  }

  function pointerDown(e) {
    if (!source) return;
    pointers.set(e.pointerId, e);
    if (pointers.size === 1) {
      drag = { id:e.pointerId, x:e.clientX, y:e.clientY, tx, ty };
      return;
    }
    const [a,b]=[...pointers.values()];
    const c=center(a,b);
    pinch={distance:Math.max(1,distance(a,b)),scale,focalX:(c.x-tx)/scale,focalY:(c.y-ty)/scale};
    drag=null;
  }

  function pointerMove(e) {
    if (!pointers.has(e.pointerId) || !source) return;
    pointers.set(e.pointerId,e);
    const values=[...pointers.values()];
    if (values.length>=2 && pinch) {
      const [a,b]=values, c=center(a,b);
      scale=clamp(pinch.scale*(distance(a,b)/pinch.distance),minScale,maxScale);
      tx=c.x-pinch.focalX*scale;
      ty=c.y-pinch.focalY*scale;
      constrain(); render(); e.preventDefault(); return;
    }
    if (drag && drag.id===e.pointerId) {
      tx=drag.tx+(e.clientX-drag.x);
      ty=drag.ty+(e.clientY-drag.y);
      constrain(); render(); e.preventDefault();
    }
  }

  function pointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size<2) pinch=null;
    if (!pointers.size) drag=null;
  }

  function setSource(next, suggestedCrop, savedCrop) {
    source=next;
    suggested=suggestedCrop || {x:0,y:0,width:next.width,height:next.height};
    imageWidth=next.width; imageHeight=next.height; crop=savedCrop || suggested;
    image.src=next.url; image.alt=label;
    image.onload=()=>{ if (!destroyed) requestAnimationFrame(()=>!destroyed && applyCrop(crop || suggested)); };
  }

  function setAspectRatio(next) { ratio=Math.max(0.05,Number(next)||1); viewport.style.aspectRatio=String(ratio); if (source) applyCrop(crop||suggested); }

  resetButton.addEventListener("click",reset);
  zoomOut.addEventListener("click",()=>zoomAt(.88));
  zoomIn.addEventListener("click",()=>zoomAt(1.14));
  viewport.addEventListener("pointerdown",pointerDown);
  viewport.addEventListener("pointermove",pointerMove,{passive:false});
  viewport.addEventListener("pointerup",pointerUp);
  viewport.addEventListener("pointercancel",pointerUp);
  viewport.addEventListener("wheel",e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoomAt(e.deltaY<0?1.12:.89,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  viewport.addEventListener("dblclick",reset);
  viewport.addEventListener("contextmenu",e=>e.preventDefault());
  observer=new ResizeObserver(()=>{if(source){const r=getCropRect();requestAnimationFrame(()=>!destroyed&&applyCrop(r||suggested));}});
  observer.observe(viewport);

  return {
    setSource,
    setAspectRatio,
    setOnChange(fn){ onChange=typeof fn==="function"?fn:()=>{}; },
    getCropRect,
    reset,
    getNavigationApi(){ return {setNavigation({index,count,onPrevious,onNext}){ nav.replaceChildren(); if(count<=1)return; const p=document.createElement("button");p.type="button";p.className="button secondary";p.textContent="Previous";p.disabled=index<=0;p.addEventListener("click",onPrevious);const n=document.createElement("button");n.type="button";n.className="button secondary";n.textContent="Next";n.disabled=index>=count-1;n.addEventListener("click",onNext);nav.append(p,n); }}; },
    destroy(){ destroyed=true;observer?.disconnect();pointers.clear();image.removeAttribute("src");container.replaceChildren(); }
  };
}
