(() => {
  function loadTinyMiaPet() {
    if (window.__miaPetLoaderAdded) return;
    window.__miaPetLoaderAdded = true;
    const script = document.createElement('script');
    script.src = '/mia-pet.js?v=vesper-20260909-r1';
    script.defer = true;
    document.head.appendChild(script);
  }

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    loadTinyMiaPet();
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    body::after { display: none !important; }
    .ambient-orb-canvas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: -1;
    }
  `;
  document.head.appendChild(style);

  const canvas = document.createElement('canvas');
  canvas.className = 'ambient-orb-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    loadTinyMiaPet();
    return;
  }

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let last = performance.now();

  function makeParticle() {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(4.5, 11.5);
    return {
      x: rand(0, width),
      y: rand(0, height),
      radius: rand(1.05, 2.15),
      glow: rand(8, 15),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      phase: rand(0, Math.PI * 2),
      phase2: rand(0, Math.PI * 2),
      turn: rand(0.09, 0.23),
      fieldScale: rand(0.75, 1.35),
      breathe: rand(0.18, 0.42),
      alpha: rand(0.18, 0.38),
      nextNudge: rand(1.5, 6),
      nudge: rand(-0.55, 0.55)
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = clamp(Math.round((width * height) / 90000), 14, 28);
    if (particles.length > target) particles.length = target;
    while (particles.length < target) particles.push(makeParticle());
  }

  function updateParticle(p, dt, t) {
    if (t > p.nextNudge) {
      p.nudge = rand(-0.75, 0.75);
      p.nextNudge = t + rand(2.5, 8.5);
    }

    const nx = p.x / Math.max(width, 1);
    const ny = p.y / Math.max(height, 1);
    const field =
      Math.sin((nx * 5.1 + t * 0.055) * p.fieldScale + p.phase) +
      Math.cos((ny * 4.3 - t * 0.047) * p.fieldScale + p.phase2) +
      0.55 * Math.sin((nx + ny) * 7.4 + t * 0.031 + p.phase2);

    const angle = field * 1.35 + p.nudge + Math.sin(t * 0.13 + p.phase) * 0.4;
    const targetSpeed = p.speed * (0.82 + 0.2 * Math.sin(t * 0.17 + p.phase2));
    const targetVx = Math.cos(angle) * targetSpeed;
    const targetVy = Math.sin(angle) * targetSpeed;
    const easing = 1 - Math.exp(-p.turn * dt * 60);

    p.vx += (targetVx - p.vx) * easing;
    p.vy += (targetVy - p.vy) * easing;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const margin = 34;
    if (p.x < -margin) p.x = width + margin;
    if (p.x > width + margin) p.x = -margin;
    if (p.y < -margin) p.y = height + margin;
    if (p.y > height + margin) p.y = -margin;
  }

  function drawParticle(p, t) {
    const pulse = 1 + Math.sin(t * p.breathe + p.phase) * 0.12;
    const glowRadius = p.glow * pulse;
    const alpha = p.alpha * (0.72 + 0.28 * Math.sin(t * p.breathe + p.phase2));
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);

    gradient.addColorStop(0, `rgba(225, 181, 255, ${alpha})`);
    gradient.addColorStop(0.12, `rgba(190, 118, 255, ${alpha * 0.62})`);
    gradient.addColorStop(0.42, `rgba(157, 82, 235, ${alpha * 0.22})`);
    gradient.addColorStop(1, 'rgba(132, 62, 220, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(231, 197, 255, ${Math.min(0.7, alpha * 1.45)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    const t = now / 1000;
    last = now;

    if (!document.hidden) {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        updateParticle(p, dt, t);
        drawParticle(p, t);
      }
    }

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(frame);
  loadTinyMiaPet();
})();