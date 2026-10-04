(() => {
  const lightScript = document.createElement('script');
  lightScript.src = '/hand-light.js?v=20261003-r6';
  lightScript.defer = true;
  document.head.appendChild(lightScript);
  function loadTinyMiaPet() {
    if (window.__miaPetLoaderAdded) return;
    window.__miaPetLoaderAdded = true;
    const script = document.createElement('script');
    script.src = '/mia-pet.js?v=myspace-anime-20261001-r3';
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

/* Decorative cursor, fine mouse pointers only. */
(() => {
  function bootCursor() {
    if (document.getElementById('site-custom-cursor')) return;
    const fine = matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const pearl = document.currentScript?.dataset.cursorStyle === 'pearl' || false;
    const style = document.createElement('style');
    style.textContent = `
      html.site-cursor-active,html.site-cursor-active * { cursor:none!important; }
      #site-custom-cursor,#site-cursor-trail {position:fixed;left:0;top:0;pointer-events:none!important;z-index:2147483647;user-select:none;}
      #site-custom-cursor {display:none;will-change:transform;}
      #site-custom-cursor.visible {display:block;}
      /* Morteva bubbly violet arrow — selected 50% (16 × 20). */
      #site-custom-cursor.purple {width:16px;height:20px;margin:-1.5px 0 0 -1.6px;border-radius:0;background:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%20100%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22c%22%20cx%3D%22.32%22%20cy%3D%22.28%22%20r%3D%22.9%22%3E%3Cstop%20stop-color%3D%22%23fff4ff%22%2F%3E%3Cstop%20offset%3D%22.35%22%20stop-color%3D%22%23efccff%22%2F%3E%3Cstop%20offset%3D%22.72%22%20stop-color%3D%22%23d99aff%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23c77df5%22%2F%3E%3C%2FradialGradient%3E%3ClinearGradient%20id%3D%22s%22%20x2%3D%22.6%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.95%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%220%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M8%2013%20C7%205%2014%203%2021%208%20L65%2037%20C76%2044%2077%2054%2066%2058%20L53%2061%20L65%2078%20C73%2091%2055%20101%2047%2089%20L34%2071%20L24%2082%20C16%2090%209%2085%209%2076%20Z%22%20fill%3D%22url(%23c)%22%2F%3E%3Cpath%20d%3D%22M13%2016%20C12%209%2017%2010%2022%2013%20L60%2039%20C67%2044%2066%2049%2059%2048%20C44%2045%2028%2034%2020%2029%20C15%2026%2014%2022%2013%2016%20Z%22%20fill%3D%22url(%23s)%22%2F%3E%3Cpath%20d%3D%22M16%2039%20C16%2053%2016%2067%2019%2072%22%20fill%3D%22none%22%20stroke%3D%22%23fff0ff%22%20stroke-opacity%3D%22.6%22%20stroke-width%3D%223.5%22%20stroke-linecap%3D%22round%22%2F%3E%3Cellipse%20cx%3D%2257%22%20cy%3D%2283%22%20rx%3D%225%22%20ry%3D%228%22%20transform%3D%22rotate(-32%2057%2083)%22%20fill%3D%22%23fff0ff%22%20opacity%3D%22.4%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat;box-shadow:none;border:0;outline:0;filter:drop-shadow(0 0 1.5px #cb80ff99) drop-shadow(0 0 4.5px #b960ff66);}
      #site-custom-cursor.purple.engaged {width:32px;height:32px;margin:-3px 0 0 -15px;background-image:url('/assets/cursors/morteva-link.png');filter:none;}
      #site-custom-cursor.pearl {width:26px;height:32px;filter:drop-shadow(0 0 3px #d5e7ff88);}
      #site-custom-cursor.pearl::before {content:'';position:absolute;inset:0;background:linear-gradient(135deg,#fffef5 5%,#e6f6ff 27%,#f5ddf3 48%,#e9e6ff 67%,#fffce9);clip-path:polygon(0 0,94% 62%,57% 67%,43% 100%,25% 91%,36% 61%,0 72%);}
      #site-custom-cursor.pearl::after {content:'';position:absolute;left:4px;top:7px;width:2px;height:12px;transform:rotate(-33deg);background:#57677b88;}
      #site-custom-cursor.pearl.engaged {filter:drop-shadow(0 0 5px #fffafddd);}
      #site-cursor-trail {inset:0;overflow:hidden;}
      #site-cursor-trail i {position:absolute;width:5px;height:5px;margin:-2.5px;border-radius:50%;background:#bc71f3;opacity:.075;animation:cursor-fade 150ms linear forwards;}
      @keyframes cursor-fade {to{opacity:0;}}
      @media print {#site-custom-cursor,#site-cursor-trail{display:none!important;}}
    `;
    const cursor=document.createElement('div');cursor.id='site-custom-cursor';cursor.className=pearl?'pearl':'purple';cursor.setAttribute('aria-hidden','true');
    const trail=document.createElement('div');trail.id='site-cursor-trail';trail.setAttribute('aria-hidden','true');
    document.head.append(style);document.body.append(cursor,trail);
    let lastTrail=0;
    function hide(){cursor.classList.remove('visible');document.documentElement.classList.remove('site-cursor-active');trail.replaceChildren();}
    function move(event){
      if(!fine.matches || event.pointerType!=='mouse' || document.fullscreenElement){hide();return;}
      const target=event.target instanceof Element?event.target:null;
      if(target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),iframe,video,audio,[disabled],[aria-disabled="true"]')){hide();return;}
      cursor.style.transform=`translate3d(${event.clientX}px,${event.clientY}px,0)`;
      cursor.classList.add('visible');document.documentElement.classList.add('site-cursor-active');
      cursor.classList.toggle('engaged',Boolean(target?.closest('a,button,summary,[role="button"],[role="link"]')));
    }
    document.addEventListener('pointermove',move,{passive:true});
    document.documentElement.addEventListener('pointerleave',hide);
    document.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')hide();},{passive:true});
    document.addEventListener('focusin',event=>{if(event.target?.matches('input,textarea,select,[contenteditable]'))hide();});
    window.addEventListener('blur',hide);window.addEventListener('pagehide',hide);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
    document.addEventListener('fullscreenchange',hide);fine.addEventListener('change',hide);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootCursor,{once:true});else bootCursor();
})();

