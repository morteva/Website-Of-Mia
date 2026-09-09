/* Tiny Mia — Vesper artwork integration, 2026-09-09.
   Uses the Vesper transparent sprite atlas with Tiny Mia's page-aware behavior,
   prewritten imagined thoughts, pause/hide controls, and gentle blend only on slower poses. */
(() => {
  'use strict';
  if (window.__miaPetBooted) return;
  window.__miaPetBooted = true;

  const options = window.MIA_PET_CONFIG || {};
  const base = document.currentScript?.src || document.baseURI;
  const asset = (name) => new URL(name, base).href;
  const SHEET_COLUMNS = 8;
  const SHEET_ROWS = 11;
  const RELEASE = 'vesper-20260909-r1';
  const CELL_WIDTH = 192;
  const CELL_HEIGHT = 208;

  const animations = {
    idle:     { row: 0, count: 6, loop: true, durations: [220, 90, 90, 110, 110, 240], blend: true },
    runRight: { row: 1, count: 8, loop: true, durations: [75, 75, 75, 75, 75, 75, 75, 110], blend: false },
    runLeft:  { row: 2, count: 8, loop: true, durations: [75, 75, 75, 75, 75, 75, 75, 110], blend: false },
    wave:     { row: 3, count: 4, durations: [100, 90, 90, 150], blend: false },
    jump:     { row: 4, count: 5, durations: [90, 80, 100, 80, 140], blend: false },
    failed:   { row: 5, count: 8, durations: [110, 110, 110, 110, 110, 110, 110, 180], blend: false },
    waiting:  { row: 6, count: 6, durations: [120, 120, 120, 120, 120, 180], blend: true },
    working:  { row: 7, count: 6, durations: [85, 85, 85, 85, 85, 130], blend: false },
    review:   { row: 8, count: 6, durations: [120, 120, 120, 120, 120, 190], blend: true },
    lookA:    { row: 9, count: 8, durations: Array(8).fill(100), blend: true },
    lookB:    { row: 10, count: 8, durations: Array(8).fill(100), blend: true }
  };

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const random = (lo, hi) => lo + Math.random() * (hi - lo);
  const choose = (a) => a[Math.floor(Math.random() * a.length)];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motion.matches;
  const storageKey = 'tiny-mia-v3'; // Preserve existing pause/hide and seen-line preferences.

  function readState() {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}') || {}; }
    catch { return {}; }
  }

  const saved = readState();
  let quiet = !!saved.quiet, hidden = !!saved.hidden;
  let seen = new Set(Array.isArray(saved.seen) ? saved.seen : []);
  let lines = [], lastText = '', x = 0, targetX = 0, moving = false;
  let animation = 'idle', animationStart = 0, drawn = '';
  let clock = 0, lastTime = 0, raf = 0, nextBehavior = random(6, 12);
  let nextSpeech = 4, bubbleUntil = 0, ready = false;

  const path = (options.page || location.pathname).toLowerCase();
  const page = path.includes('gallery') ? 'gallery' : path.includes('youtube') ? 'youtube' : path.includes('videos') ? 'videos' : 'home';
  const favored = page === 'gallery'
    ? ['gaming_general', 'mmo_leadership', 'bdo', 'cars', 'animals', 'fashion_beauty']
    : page === 'youtube' || page === 'videos'
      ? ['music', 'people', 'random_observations', 'night_brain']
      : ['feral_general', 'goth_style', 'website', 'mira_beside', 'random_observations', 'snacks'];

  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ quiet, hidden, seen: [...seen] })); }
    catch { }
  }

  function installLines(data) {
    const input = Array.isArray(data) ? data : data?.lines;
    if (!Array.isArray(input)) throw new Error('Thought pool must contain a lines array.');
    const unique = new Set();
    lines = input
      .map((entry) => typeof entry === 'string' ? { text: entry, category: 'general' } : entry)
      .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim())
      .filter((entry) => { if (unique.has(entry.text)) return false; unique.add(entry.text); return true; })
      .map((entry) => ({ text: entry.text, category: entry.category || 'general' }));
    seen = new Set([...seen].filter((text) => unique.has(text)));
    if (root) root.dataset.lineCount = String(lines.length);
  }

  function pickLine() {
    if (!lines.length) return 'Tiny Mia is loading opinions at an alarming rate.';
    let available = lines.filter((entry) => !seen.has(entry.text));
    if (!available.length) {
      seen.clear();
      available = lines.filter((entry) => entry.text !== lastText);
      if (!available.length) available = lines;
    }
    const specific = available.filter((entry) => favored.includes(entry.category));
    const entry = choose(specific.length && Math.random() < .6 ? specific : available);
    seen.add(entry.text);
    lastText = entry.text;
    persist();
    return entry.text;
  }

  const css = document.createElement('style');
  css.textContent = `
    .tm-root { --tm-size:110px; position:fixed; bottom:max(12px,env(safe-area-inset-bottom));
      left:0; width:var(--tm-size); height:auto; z-index:38; pointer-events:none;
      color:#f5edf7; font-family:Inter,system-ui,sans-serif; }
    .tm-root[hidden], .tm-root [hidden], .tm-bubble[hidden], .tm-restore[hidden] { display:none !important; }
    .tm-root button,.tm-restore { font:inherit; -webkit-tap-highlight-color:transparent; }
    .tm-sprite { all:unset; display:block; width:100%; height:calc(var(--tm-size) * 208 / 192); cursor:pointer; pointer-events:auto; }
    .tm-sprite canvas { display:block; width:100%; height:100%; pointer-events:none;
      filter:drop-shadow(0 4px 8px rgba(0,0,0,.6)) drop-shadow(0 0 7px rgba(169,115,214,.32)); }
    .tm-controls { display:flex; gap:5px; justify-content:center; pointer-events:auto; }
    .tm-control { display:grid; place-items:center; border:1px solid #74617d; border-radius:50%;
      width:25px; height:25px; padding:0; background:rgba(13,10,18,.93); color:#ded0e8; cursor:pointer; }
    .tm-control:hover { background:#302138; }
    .tm-root button:focus-visible,.tm-restore:focus-visible { outline:2px solid #d5a4ed; outline-offset:4px; }
    .tm-bubble { box-sizing:border-box; position:fixed; z-index:39; width:min(300px,calc(100vw - 24px));
      border:1px solid rgba(202,148,222,.38); border-radius:16px; padding:14px 17px;
      background:rgba(17,12,23,.95); color:#f8f0fc; box-shadow:0 8px 30px #0009;
      backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); pointer-events:none;
      font:500 13px/1.55 Inter,system-ui,sans-serif; }
    .tm-bubble small { display:block; margin-bottom:6px; font-size:9px; font-weight:750;
      letter-spacing:.14em; color:#be8bd2; text-transform:uppercase; }
    .tm-bubble p { margin:0; }
    .tm-restore { position:fixed; right:12px; bottom:max(12px,env(safe-area-inset-bottom)); z-index:38;
      border:1px solid #735781; border-radius:20px; background:#120e18; padding:8px 13px;
      color:#e6cfef; cursor:pointer; font-size:12px; }
    @media(max-width:600px) { .tm-root { --tm-size:82px; } .tm-control { width:28px; height:28px; } }
    @media print { .tm-root,.tm-bubble,.tm-restore { display:none !important; } }
  `;
  document.head.append(css);

  const root = document.createElement('div');
  root.className = 'tm-root';
  root.hidden = true;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Tiny Mia website mascot');
  root.title = 'Playful prewritten lines inspired by Mia, not live thoughts or recorded quotations.';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tm-sprite';
  button.setAttribute('aria-label', 'Ask Tiny Mia for another thought');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  button.append(canvas);

  const controls = document.createElement('div');
  controls.className = 'tm-controls';
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.className = 'tm-control';
  const hide = document.createElement('button');
  hide.type = 'button';
  hide.className = 'tm-control';
  hide.textContent = '×';
  hide.title = 'Hide Tiny Mia';
  hide.setAttribute('aria-label', 'Hide Tiny Mia');
  controls.append(pause, hide);
  root.append(button, controls);

  const bubble = document.createElement('div');
  bubble.className = 'tm-bubble';
  bubble.hidden = true;
  bubble.id = 'tiny-mia-thought';
  bubble.setAttribute('aria-live', 'off');
  bubble.setAttribute('aria-atomic', 'true');
  const label = document.createElement('small');
  label.textContent = 'Tiny Mia · imagined thoughts';
  const copy = document.createElement('p');
  bubble.append(label, copy);

  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'tm-restore';
  restore.textContent = 'Show Tiny Mia';
  restore.hidden = true;

  document.body.append(root, bubble, restore);
  const ctx = canvas.getContext('2d');
  if (!ctx) { root.remove(); bubble.remove(); restore.remove(); return; }

  const sheet = new Image();
  sheet.decoding = 'async';

  function width() { return root.getBoundingClientRect().width || (innerWidth < 600 ? 82 : 110); }

  function setPosition(next) {
    x = clamp(next, 12, Math.max(12, innerWidth - width() - 12));
    root.style.left = `${x}px`;
    positionBubble();
  }

  function positionBubble() {
    if (bubble.hidden) return;
    const rect = root.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    bubble.style.left = `${clamp(rect.left + rect.width / 2 - b.width / 2, 12, Math.max(12, innerWidth - b.width - 12))}px`;
    bubble.style.top = `${Math.max(12, rect.top - b.height - 10)}px`;
  }

  function resize() {
    const size = width();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * CELL_HEIGHT / CELL_WIDTH * dpr);
    drawn = '';
    setPosition(x);
    targetX = clamp(targetX, 12, Math.max(12, innerWidth - size - 12));
    if (ready) draw();
  }

  function play(name) {
    animation = animations[name] ? name : 'idle';
    animationStart = clock;
    drawn = '';
    root.dataset.animation = animation;
    if (ready) draw();
  }

  function frameRect(row, frame) {
    return [frame * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT];
  }

  function getFrameInfo() {
    let spec = animations[animation];
    let elapsed = Math.max(0, clock - animationStart) * 1000;
    let frame = 0;
    let duration = spec.durations[0];

    if (reduced()) {
      return { spec, frame: 0, nextFrame: 0, progress: 0 };
    }

    if (!spec.durations || !spec.durations.length) {
      return { spec, frame: 0, nextFrame: 0, progress: 0 };
    }

    const total = spec.durations.reduce((a, b) => a + b, 0);
    if (elapsed >= total) {
      if (!spec.loop) {
        animation = 'idle';
        animationStart = clock;
        spec = animations[animation];
        elapsed = 0;
      } else {
        elapsed = elapsed % total;
      }
    }

    let acc = 0;
    for (let i = 0; i < spec.count; i++) {
      const d = spec.durations[i] ?? spec.durations[spec.durations.length - 1] ?? 100;
      if (elapsed < acc + d) {
        frame = i;
        duration = d;
        break;
      }
      acc += d;
      frame = i;
      duration = d;
    }

    const nextFrame = spec.loop ? (frame + 1) % spec.count : Math.min(frame + 1, spec.count - 1);
    const progress = clamp((elapsed - acc) / duration, 0, 1);
    return { spec, frame, nextFrame, progress };
  }

  function drawFrame(row, frame, alpha = 1) {
    const [sx, sy, sw, sh] = frameRect(row, frame);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sheet, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function draw() {
    if (!ready) return;
    const info = getFrameInfo();
    const blend = info.spec.blend && !reduced() && !quiet
      ? clamp((info.progress - 0.7) / 0.3, 0, 1) : 0;
    const key = `${animation}:${info.frame}:${info.nextFrame}:${Math.round(blend * 1000)}:${canvas.width}`;
    if (key === drawn) return;
    drawn = key;
    root.dataset.animation = animation;
    root.dataset.frame = String(info.frame);
    root.dataset.row = String(info.spec.row);
    root.dataset.blend = String(blend);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    if (blend > 0) {
      drawFrame(info.spec.row, info.frame, 1 - blend);
      // Add premultiplied colors instead of making the cat translucent mid-blend.
      ctx.globalCompositeOperation = 'lighter';
      drawFrame(info.spec.row, info.nextFrame, blend);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      drawFrame(info.spec.row, info.frame, 1);
    }
  }

  function say(text, manual = false) {
    moving = false;
    targetX = x;
    play(reduced() ? 'idle' : manual ? 'wave' : choose(['waiting', 'review', 'lookA', 'lookB']));
    bubble.setAttribute('aria-live', manual ? 'polite' : 'off');
    copy.textContent = text || pickLine();
    bubble.hidden = false;
    bubbleUntil = clock + clamp(copy.textContent.length * .055, 5, 12);
    nextSpeech = clock + random(25, 55);
    nextBehavior = Math.max(nextBehavior, bubbleUntil + 2);
    positionBubble();
  }

  function unobstructed() {
    return !document.hidden
      && !hidden
      && !document.querySelector('.lightbox.open,dialog[open]')
      && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')
      && !getSelection()?.toString();
  }

  function act() {
    if (!bubble.hidden) return;
    if (Math.random() < .26) {
      const distance = random(36, 150);
      const dir = x > innerWidth * .65 ? -1 : x < innerWidth * .25 ? 1 : choose([-1, 1]);
      targetX = clamp(x + distance * dir, 12, Math.max(12, innerWidth - width() - 12));
      moving = Math.abs(targetX - x) > 1;
      play(targetX < x ? 'runLeft' : 'runRight');
    } else {
      play(choose(['idle', 'idle', 'wave', 'jump', 'waiting', 'working', 'review', 'lookA', 'lookB', 'failed']));
    }
    nextBehavior = clock + random(8, 18);
  }

  function tick(now) {
    raf = 0;
    if (ready && reduced()) {
      moving = false;
      animation = 'idle';
      animationStart = clock;
      drawn = '';
      draw();
      lastTime = 0;
      return;
    }
    if (!ready || document.hidden || hidden || quiet) { lastTime = 0; return; }

    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now;
    clock += dt;
    const allowed = unobstructed();

    if (!bubble.hidden && (clock > bubbleUntil || !allowed)) bubble.hidden = true;

    if (allowed) {
      if (moving) {
        const delta = targetX - x;
        const step = 72 * dt;
        if (Math.abs(delta) <= step) {
          moving = false;
          setPosition(targetX);
          play('idle');
        } else {
          setPosition(x + Math.sign(delta) * step);
          if (!['runLeft', 'runRight'].includes(animation)) play(delta < 0 ? 'runLeft' : 'runRight');
        }
      } else if (clock >= nextBehavior) {
        act();
      }
      if (clock >= nextSpeech) say();
    } else {
      nextSpeech = Math.max(nextSpeech, clock + 5);
    }

    draw();
    start();
  }

  function start() {
    if (!raf && ready && !hidden && !quiet && !reduced() && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; lastTime = 0; }

  function sync() {
    root.hidden = !ready || hidden;
    restore.hidden = !ready || !hidden;
    pause.textContent = quiet ? '▶' : 'Ⅱ';
    pause.setAttribute('aria-pressed', String(quiet));
    pause.title = quiet ? 'Resume Tiny Mia' : 'Pause movement and automatic thoughts';
    pause.setAttribute('aria-label', pause.title);
    if (hidden || quiet || reduced() || document.hidden) { stop(); moving = false; bubble.hidden = true; }
    if (reduced()) { animation = 'idle'; animationStart = clock; drawn = ''; draw(); }
    start();
    persist();
  }

  let manualTimer = 0;
  button.addEventListener('click', () => {
    say(undefined, true);
    clearTimeout(manualTimer);
    if (quiet || reduced()) manualTimer = setTimeout(() => { bubble.hidden = true; }, Math.round(clamp(copy.textContent.length * 55, 5000, 12000)));
  });
  pause.addEventListener('click', () => { quiet = !quiet; sync(); });
  hide.addEventListener('click', () => { hidden = true; sync(); restore.focus(); });
  restore.addEventListener('click', () => { hidden = false; sync(); button.focus(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') bubble.hidden = true; });
  document.addEventListener('visibilitychange', sync);
  if (motion.addEventListener) motion.addEventListener('change', sync); else motion.addListener(sync);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', sync);

  const bank = options.thoughts || window.MIA_PET_THOUGHTS;
  if (bank) installLines(bank);
  else fetch(options.thoughtsSrc || asset('tiny-mia-thoughts.json'))
    .then((response) => { if (!response.ok) throw new Error(`Thought bank: ${response.status}`); return response.json(); })
    .then(installLines)
    .catch((error) => console.warn('Tiny Mia:', error.message));

  sheet.onload = () => {
    if (sheet.naturalWidth !== SHEET_COLUMNS * CELL_WIDTH || sheet.naturalHeight !== SHEET_ROWS * CELL_HEIGHT) {
      console.warn('Tiny Mia: incorrect Vesper atlas dimensions; keeping mascot hidden.');
      return;
    }
    ready = true;
    root.dataset.release = RELEASE;
    root.dataset.ready = 'true';
    root.dataset.lineCount = String(lines.length);
    root.hidden = hidden;
    x = innerWidth - 142;
    resize();
    play('idle');
    sync();
  };
  sheet.onerror = () => { console.warn('Tiny Mia: Vesper sprite atlas has not been installed.'); };
  sheet.src = options.spriteSrc || asset('assets/vesper-spritesheet.webp');
})();
