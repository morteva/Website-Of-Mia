/* Tiny Mia static corner gremlin, 2026-09-10.
   Keeps the prewritten imagined-thought pool, but replaces the animated Vesper sprite
   with Mia's chosen static creature in the far lower-right corner. */
(() => {
  'use strict';
  if (window.__miaPetBooted) return;
  window.__miaPetBooted = true;

  const options = window.MIA_PET_CONFIG || {};
  const base = document.currentScript?.src || document.baseURI;
  const asset = (name) => new URL(name, base).href;
  const storageKey = 'tiny-mia-v4-static';

  const path = (options.page || location.pathname).toLowerCase();
  const page = path.includes('gallery') ? 'gallery'
    : path.includes('youtube') ? 'youtube'
    : path.includes('videos') ? 'videos'
    : 'home';

  const favored = page === 'gallery'
    ? ['gaming_general', 'mmo_leadership', 'bdo', 'cars', 'animals', 'fashion_beauty']
    : page === 'youtube' || page === 'videos'
      ? ['music', 'people', 'random_observations', 'night_brain']
      : ['feral_general', 'goth_style', 'website', 'mira_beside', 'random_observations', 'snacks'];

  const choose = (items) => items[Math.floor(Math.random() * items.length)];

  function readState() {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}') || {}; }
    catch { return {}; }
  }

  const saved = readState();
  let hidden = !!saved.hidden;
  let seen = new Set(Array.isArray(saved.seen) ? saved.seen : []);
  let lines = [];
  let lastText = '';
  let bubbleTimer = 0;
  let speechTimer = 0;

  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ hidden, seen: [...seen] })); }
    catch {}
  }

  function installLines(data) {
    const input = Array.isArray(data) ? data : data?.lines;
    if (!Array.isArray(input)) throw new Error('Thought pool must contain a lines array.');

    const unique = new Set();
    lines = input
      .map((entry) => typeof entry === 'string' ? { text: entry, category: 'general' } : entry)
      .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim())
      .filter((entry) => {
        if (unique.has(entry.text)) return false;
        unique.add(entry.text);
        return true;
      })
      .map((entry) => ({ text: entry.text.trim(), category: entry.category || 'general' }));

    seen = new Set([...seen].filter((text) => unique.has(text)));
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
    const entry = choose(specific.length && Math.random() < 0.6 ? specific : available);
    seen.add(entry.text);
    lastText = entry.text;
    persist();
    return entry.text;
  }

  const css = document.createElement('style');
  css.textContent = `
    .tm-root {
      --tm-size: 128px;
      position: fixed;
      right: max(8px, env(safe-area-inset-right));
      bottom: max(6px, env(safe-area-inset-bottom));
      width: var(--tm-size);
      z-index: 38;
      pointer-events: none;
      font-family: Inter, system-ui, sans-serif;
    }
    .tm-root[hidden], .tm-bubble[hidden], .tm-restore[hidden] { display: none !important; }
    .tm-sprite {
      all: unset;
      display: block;
      width: 100%;
      aspect-ratio: 1;
      cursor: pointer;
      pointer-events: auto;
    }
    .tm-sprite img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
      filter: drop-shadow(0 5px 9px rgba(0,0,0,.72));
    }
    .tm-root.tm-expanded {
      --tm-size: min(62vw, 72vh);
    }
    .tm-hide {
      position: absolute;
      right: 2px;
      bottom: 0;
      display: grid;
      place-items: center;
      width: 12px;
      height: 12px;
      padding: 0;
      border: 1px solid #74617d;
      border-radius: 50%;
      background: rgba(13,10,18,.93);
      color: #ded0e8;
      cursor: pointer;
      pointer-events: auto;
      font: 8px/1 Inter, system-ui, sans-serif;
    }
    .tm-expand {
      position: absolute;
      right: 2px;
      bottom: 18px;
      display: grid;
      place-items: center;
      width: 14px;
      height: 14px;
      padding: 0;
      border: 1px solid #74617d;
      border-radius: 3px;
      background: rgba(13,10,18,.93);
      color: #ded0e8;
      cursor: pointer;
      pointer-events: auto;
      font: 9px/1 Inter, system-ui, sans-serif;
    }
    .tm-minimize-back {
      position: absolute;
      left: 50%;
      top: -54px;
      display: none;
      min-width: min(280px, calc(100vw - 24px));
      transform: translateX(-50%);
      border: 1px solid rgba(202,148,222,.58);
      border-radius: 999px;
      padding: 13px 24px;
      background: linear-gradient(135deg, rgba(43,20,51,.98), rgba(20,13,27,.98));
      color: #fff5ff;
      box-shadow: 0 10px 32px #000a, inset 0 1px rgba(255,255,255,.08);
      cursor: pointer;
      pointer-events: auto;
      font: 800 15px/1 Inter, system-ui, sans-serif;
      letter-spacing: .05em;
      text-transform: uppercase;
    }
    .tm-root.tm-expanded .tm-expand { display: none; }
    .tm-root.tm-expanded .tm-minimize-back { display: block; }
    .tm-hide:hover, .tm-expand:hover { background: #302138; }
    .tm-minimize-back:hover { border-color: #d5a4ed; background: linear-gradient(135deg, #472253, #23152d); }
    .tm-sprite:focus-visible, .tm-hide:focus-visible, .tm-expand:focus-visible,
    .tm-minimize-back:focus-visible, .tm-restore:focus-visible {
      outline: 2px solid #d5a4ed;
      outline-offset: 4px;
    }
    .tm-bubble {
      box-sizing: border-box;
      position: fixed;
      right: max(12px, env(safe-area-inset-right));
      bottom: calc(max(6px, env(safe-area-inset-bottom)) + 140px);
      z-index: 39;
      width: min(300px, calc(100vw - 24px));
      border: 1px solid rgba(202,148,222,.38);
      border-radius: 16px;
      padding: 14px 17px;
      background: rgba(17,12,23,.95);
      color: #f8f0fc;
      box-shadow: 0 8px 30px #0009;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      pointer-events: none;
      font: 500 13px/1.55 Inter, system-ui, sans-serif;
    }
    .tm-bubble small {
      display: block;
      margin-bottom: 6px;
      font-size: 9px;
      font-weight: 750;
      letter-spacing: .14em;
      color: #be8bd2;
      text-transform: uppercase;
    }
    .tm-bubble p { margin: 0; }
    .tm-restore {
      position: fixed;
      right: 12px;
      bottom: max(12px, env(safe-area-inset-bottom));
      z-index: 38;
      border: 1px solid #735781;
      border-radius: 20px;
      background: #120e18;
      padding: 8px 13px;
      color: #e6cfef;
      cursor: pointer;
      font: 12px Inter, system-ui, sans-serif;
    }
    @media (max-width: 600px) {
      .tm-root { --tm-size: 96px; right: 4px; bottom: 4px; }
      .tm-root.tm-expanded { --tm-size: min(82vw, 68vh); right: 8px; }
      .tm-bubble { bottom: 108px; }
      .tm-minimize-back { top: -48px; min-width: min(240px, calc(100vw - 20px)); padding: 11px 18px; font-size: 13px; }
    }
    @media print {
      .tm-root, .tm-bubble, .tm-restore { display: none !important; }
    }
  `;
  document.head.append(css);

  const root = document.createElement('div');
  root.className = 'tm-root';
  root.hidden = true;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Tiny Mia website mascot');
  root.title = 'Playful prewritten lines inspired by Mia, not live thoughts or recorded quotations.';

  const sprite = document.createElement('button');
  sprite.type = 'button';
  sprite.className = 'tm-sprite';
  sprite.setAttribute('aria-label', 'Ask Tiny Mia for another thought');
  sprite.title = 'Click for another Tiny Mia thought';

  const img = document.createElement('img');
  img.src = asset('tiny-mia-gothic.png?v=20260918-doll1');
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  sprite.append(img);

  const hide = document.createElement('button');
  hide.type = 'button';
  hide.className = 'tm-hide';
  hide.textContent = '×';
  hide.title = 'Hide Tiny Mia';
  hide.setAttribute('aria-label', 'Hide Tiny Mia');

  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'tm-expand';
  expand.textContent = '⛶';
  expand.title = 'Make Tiny Mia full size';
  expand.setAttribute('aria-label', 'Make Tiny Mia full size');

  const minimizeBack = document.createElement('button');
  minimizeBack.type = 'button';
  minimizeBack.className = 'tm-minimize-back';
  minimizeBack.textContent = 'Minimize Back';
  minimizeBack.setAttribute('aria-label', 'Minimize Tiny Mia back to normal size');

  root.append(sprite, expand, hide, minimizeBack);

  const bubble = document.createElement('div');
  bubble.className = 'tm-bubble';
  bubble.hidden = true;
  bubble.id = 'tiny-mia-thought';
  bubble.setAttribute('aria-live', 'off');
  bubble.setAttribute('aria-atomic', 'true');

  const label = document.createElement('small');
  label.textContent = 'Tiny Mia';

  const copy = document.createElement('p');
  bubble.append(label, copy);

  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'tm-restore';
  restore.textContent = 'Show Tiny Mia';
  restore.hidden = true;

  document.body.append(root, bubble, restore);

  function say(text) {
    if (hidden) return;
    copy.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => { bubble.hidden = true; }, 8500);
  }

  function scheduleNext() {
    clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => {
      say(pickLine());
      scheduleNext();
    }, 15000 + Math.random() * 9000);
  }

  sprite.addEventListener('click', () => {
    say(pickLine());
    scheduleNext();
  });

  hide.addEventListener('click', () => {
    root.classList.remove('tm-expanded');
    hidden = true;
    root.hidden = true;
    bubble.hidden = true;
    restore.hidden = false;
    clearTimeout(bubbleTimer);
    clearTimeout(speechTimer);
    persist();
  });

  expand.addEventListener('click', () => {
    root.classList.add('tm-expanded');
    bubble.hidden = true;
    clearTimeout(bubbleTimer);
  });

  minimizeBack.addEventListener('click', () => {
    root.classList.remove('tm-expanded');
  });

  restore.addEventListener('click', () => {
    hidden = false;
    restore.hidden = true;
    root.hidden = false;
    persist();
    say(pickLine());
    scheduleNext();
  });

  Promise.all([
    fetch(asset('tiny-mia-thoughts.json?v=20260910-static1'), { cache: 'force-cache' }).then((r) => {
      if (!r.ok) throw new Error(`Tiny Mia thoughts failed: ${r.status}`);
      return r.json();
    }),
    img.decode?.().catch(() => {}) || Promise.resolve()
  ])
    .then(([data]) => {
      installLines(data);
      restore.hidden = !hidden;
      root.hidden = hidden;
      if (!hidden) {
        say(pickLine());
        scheduleNext();
      }
    })
    .catch((error) => {
      console.warn(error);
      restore.hidden = !hidden;
      root.hidden = hidden;
      if (!hidden) say('Tiny Mia has become temporarily unavailable for comment. Suspicious.');
    });
})();
