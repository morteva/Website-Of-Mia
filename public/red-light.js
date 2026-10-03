/* A quiet, occasional light pass. The hand's luminance supplies its relief. */
(() => {
  const hand = document.querySelector('.site-hand-background');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!hand || reduced.matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'site-red-light';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const relief = document.createElement('canvas');
  const layer = document.createElement('canvas');
  const layerCtx = layer.getContext('2d');
  const image = new Image();
  let ready = false, width = 0, height = 0, previous = 0;
  const started = performance.now();
  image.onload = () => {
    relief.width = image.naturalWidth;
    relief.height = image.naturalHeight;
    const r = relief.getContext('2d', { willReadFrequently: true });
    r.drawImage(image, 0, 0);
    const pixels = r.getImageData(0, 0, relief.width, relief.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const brightness = pixels.data[i] * .2126 + pixels.data[i + 1] * .7152 + pixels.data[i + 2] * .0722;
      pixels.data[i + 3] = Math.min(255, brightness * 1.35) * pixels.data[i + 3] / 255;
      pixels.data[i] = 164; pixels.data[i + 1] = 24; pixels.data[i + 2] = 32;
    }
    r.putImageData(pixels, 0, 0);
    ready = true;
  };
  image.src = '/gothic-hand-background.png';
  function resize() {
    width = innerWidth; height = innerHeight;
    // Decorative light needs no high-DPI framebuffer.
    canvas.width = layer.width = width;
    canvas.height = layer.height = height;
  }
  function beam(context, x, alpha) {
    const radius = Math.max(width * .24, 250);
    const glow = context.createRadialGradient(x, height * .52, 0, x, height * .52, radius);
    glow.addColorStop(0, `rgba(116,12,24,${alpha})`);
    glow.addColorStop(.38, `rgba(86,8,20,${alpha * .7})`);
    glow.addColorStop(1, 'rgba(60,0,12,0)');
    context.save();
    context.translate(0, height * .52);
    context.scale(1, Math.max(1, height / radius));
    context.translate(0, -height * .52);
    context.fillStyle = glow;
    context.fillRect(0, -height, width, height * 3);
    context.restore();
  }
  function frame(now) {
    if (reduced.matches) { ctx.clearRect(0, 0, width, height); return; }
    requestAnimationFrame(frame);
    if (document.hidden || now - previous < 40) return;
    previous = now;
    const seconds = (now - started) / 1000;
    const phase = (seconds - 4) % 78;
    ctx.clearRect(0, 0, width, height);
    if (!ready || seconds < 4 || phase > 28) return;
    const progress = phase / 28;
    const strength = Math.sin(Math.PI * progress) ** .8;
    const x = width * (-.3 + 1.6 * progress);
    beam(ctx, x, .11 * strength);
    layerCtx.clearRect(0, 0, width, height);
    const style = getComputedStyle(hand);
    const w = parseFloat(style.width), h = parseFloat(style.height);
    const origin = style.transformOrigin.split(' ').map(Number.parseFloat);
    const top = height - parseFloat(style.bottom) - h;
    layerCtx.save();
    layerCtx.translate(parseFloat(style.left) + origin[0], top + origin[1]);
    const matrix = new DOMMatrix(style.transform);
    layerCtx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    layerCtx.translate(-origin[0], -origin[1]);
    layerCtx.drawImage(relief, 0, 0, w, h);
    layerCtx.restore();
    layerCtx.globalCompositeOperation = 'destination-in';
    beam(layerCtx, x, strength * .8);
    layerCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(layer, 0, 0);
  }
  resize();
  addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', () => {
    if (reduced.matches) ctx.clearRect(0, 0, width, height);
    else requestAnimationFrame(frame);
  });
  requestAnimationFrame(frame);
})();
