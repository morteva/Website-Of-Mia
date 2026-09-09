(() => {
  if (window.__miaPetBooted) return;
  window.__miaPetBooted = true;

  const FALLBACK_SPRITE = "data:image/webp;base64,UklGRloFAABXRUJQVlA4WAoAAAAQAAAAXwAAfQAAQUxQSP8AAAABcCRJUhDV/z9dB0GGodU9bUTEBPBXrYbQKmOgz2QU81lgOuO4YiDvGck73syiE2+SxjXjeDHa+u/PDNQRMx8fgRmpSmNYTs4yY/hY5PwqvD7zGY905DSd9fk8zSuYypZHGc62r8W2nGo6356tj7A1X8y359uzOe/DdHanvS/P/vS2mAqY2cj6AsADbMYA1SbuZMewh+ncRQk52EMTjzAGFdy5nsGMOmY0tJAZoUjDEuCYsTUcwnjECgGYuuCYx6ERPTiKIuZB3MVB9PIIuBAN1Cou1tALFmhxbTWPZ5FxXDPffMIxzut8GBOwSQNMZy55COsuccrGJzMVKGnlEwMAVlA4IDQEAADwFQCdASpgAH4APp1Em0qlo6Ihq1LbmLATiWkAEgva2i4zQy3A8h5o6Wiat4/dQbpKehyhMx/xSDCalJY/ZOC/xmw/DodiVIxFlPvq9cuC+oy4gByiJ+hRAZMW/zCCFsDbFth+osezZRB+r6Zvq1QSU6eBjk4/YKhR9lnryg3DRM6TQb2szpgJ0KN/jfkAXzheMQErQFxloM6JY9JowEO2mzgVqdHfpKu3IJOdDFxE4BThDjBEMgKAAP77nMBK+qDvRFptZjcDq2ZuICPMLaQf/knenrh0AINo5/t7kwVMhXCSRWJChXwEEqupQ1kbgHXSsJ8G1tTQaTnm9e2zNgJlVQ09UzII57XmPx0t6+PgDoVhPlzOL9zbPaXEh73784CdNtvOaweTrIaFzgTS4SXAhuMW6L+/PAZLg6yx2KykY9/+PqK43WHpuVYdoX/Xlq5kvxgTgGXngwt4NDYht1xi0gX9ITxZFmRdDduJqfYsyNQYc5oCfC0mFMTU9EzDwAVLk0jzv4/DnZeg2d1BO8yJKU7TC0NY5IwUn0cz8CPNa65umPLEiYcm1qbmw4tGzHbmvzVg9fM2FDhT0yS1+NHrsnPiX9A1A5/5DuUQcKiHTLTdAEhrmapNknw1bFJsFcf/0EtHhdiCy2XVgzc8sRqeV0sxdHexnecdyeQ3d+WOJrB6EMuJwG39AxpxP7sH6wZKq2fxWKMEfe3CBJZQVInAJw+DEvcTeT3Vm4qi5yanML8rGr2jeQhK6ICLvBAGd5sjiGlNUwvuTZa8S+nMxuljseiGMXFJE0kJsd3VaDm3FlVAD1tm6sT+JX8EppQf6S8PPK7K9RLrHW74Kl5gTXnUYVwva2uD9N74QRfBRUoqcZPvp3SaXzisgs8sOwWa5iAH5Z1a+4nD7QQwyK1lgxf4FOQC1QCQibT+L/Lld5JTUwRTQyiumvuZc9mg6hlpk6HRYpD+R4qkLvPPkuYPZ7MDTDuQ8Xdy86taoOo2uuWBFlxP4keBmIX9q/Eui1PsmepQ178SSKXmRxt2JMGdaMircImAalFMc0m6nT/YqWn5oD+xcIncaV73Pt7Fg1bqYZiqcYv7A+u+x8PttSgky2m3IyXytyGJZC0gn/L21zSBdH382AVA9KqNy2QFwx2mmKvyroccyfUE7hoNHsL3DgEXjWmF/cQ58QqH3LixDCIf5lKCm+Zs/2cAeTqie6RKhvp/l3SAcqE1Q01udQ1Xdm9cnTjOTNilaf8UsgO1BTsKCzTmPEQvgrgPGht6IcSc+Jur4NqQ6YVaDqhUKh2y9LUm0e+Hy4GiJoILC4ziAegR0uEMWycp2KU58HgoyFAz5eAjf8SzXvfNkDoP1BfWKgNO9tyPbF8mcvODDovW/sBrCpoDbxwJp1g2tPysGqPFkiaxrz//NBQr/nxNEnSZzgWWHAAAAA==";
  const FULL_SPRITE = "/tiny-mia-cat-sprite.png";
  const FRAME_W = 96;
  const FRAME_H = 126;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const rand = (min, max) => min + Math.random() * (max - min);
  const chance = (p) => Math.random() < p;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const thoughts = [
    "I was put in the corner and immediately developed opinions.",
    "This website has a tiny landlord now.",
    "If the page feels haunted, good. That means it is working.",
    "I came here to judge the layout and chew cables.",
    "The purple orbs are my emotional support weather.",
    "This looked unnecessary, so naturally it became canon.",
    "Black remains undefeated.",
    "I am decorative, not customer support.",
    "Someone left JavaScript unattended again.",
    "The responsible option was available. I saw it. Moving on.",
    "I have considered the consequences and chosen comedy.",
    "I do not need encouragement. I have already encouraged myself.",
    "I am one minor inconvenience away from becoming folklore.",
    "I woke up peaceful and then had an idea.",
    "No beige allowed. I checked.",
    "My preferred color palette is funeral with Wi-Fi.",
    "This corner needs more haunted-library energy.",
    "Tiny details are where a website stops feeling templated.",
    "A personal website should have at least one unnecessary delight.",
    "The pet is judging people from the corner. Correct design choice.",
    "I support static pages becoming mildly sentient-looking.",
    "If you stare too long, the site stares back politely.",
    "I respect any interface with a little mischief in it.",
    "Visitors should never know whether the next thought is profound or stupid.",
    "The background should reward people who stare at it too long.",
    "I like motion that feels alive without fighting the words.",
    "The gallery is basically evidence with better lighting.",
    "Past Mia left screenshots like emotional fossils.",
    "Every archive contains at least one character arc.",
    "Some of these memories survived longer than entire friend groups.",
    "Young me in the comments section was a public safety event.",
    "Mira reading my old YouTube comments was objectively a mistake.",
    "Context not guaranteed. Emotional accuracy probably high.",
    "Some comments deserve context. Some deserve a helmet.",
    "I can hear the CRONCH through the Soul.",
    "Sunflower seeds remain an infrastructure dependency.",
    "Brain Soup has entered the building.",
    "One more thing is not a time estimate.",
    "I should sleep, but the idea has acquired momentum.",
    "The clock is making accusations.",
    "My tabs have become a horizontal cry for help.",
    "The cursor is blinking with concern.",
    "I am not procrastinating. I am investigating something unrelated with rigor.",
    "The bug has become personal, which is unfortunate for both of us.",
    "CSS is easy until two rectangles disagree about reality.",
    "The browser cache is participating in psychological warfare.",
    "If rebooting fixes it, I will be grateful and offended.",
    "I changed one line and apparently summoned a new subsystem.",
    "Version control is a time machine for bad judgment.",
    "There is no such thing as temporary after the third deploy.",
    "Black Desert was supposed to be retirement. Still funny.",
    "Female characters only. This is not a debate.",
    "One more quest is the oldest lie in gaming.",
    "I logged in to relax and immediately created objectives.",
    "If there is a progress bar, I will eventually take it personally.",
    "I do not grind. I enter negotiations with repetition.",
    "A guild is not a roster. It is a place people miss when they leave.",
    "Fairness is harder than popularity and worth more.",
    "The friendships were always the real loot.",
    "The hardest guild mechanic was always human beings.",
    "I can hear passive aggression through three layers of polite wording.",
    "A good community is built in boring moments nobody screenshots.",
    "Cars taught me that expensive parts do not fix bad planning.",
    "A ten-minute car job is a myth told by parts stores.",
    "Electrical faults are where confidence goes to be humbled.",
    "There is something therapeutic about a problem you can unbolt.",
    "A clean wiring harness is art for six people and invisible to everyone else.",
    "Xenomorph design remains offensively good.",
    "I would absolutely read the cursed document. We know this.",
    "Star Trek's most unrealistic technology may be functional meetings.",
    "A haunted computer is just tech support with atmosphere.",
    "If the walls whisper my name, the lease is terminated.",
    "Music memory is unfairly powerful.",
    "A lost song title can become a multi-hour investigation.",
    "Some songs are for driving. Some are for ceiling-staring dramatically.",
    "A good string line over hip-hop still gets me immediately.",
    "Direct communication is not aggression.",
    "I trust consistency more than charm.",
    "I can handle disagreement better than hidden resentment.",
    "I would rather hear a clumsy truth than a polished manipulation.",
    "No is already a complete logistical update.",
    "My empathy includes me or it becomes exploitation.",
    "A boundary is not punishment for noticing my limit.",
    "I can miss someone and still know returning would be a mistake.",
    "I like people in carefully selected quantities.",
    "My social battery does not issue reliable percentage warnings.",
    "Silence with the right person beats conversation with the wrong one.",
    "I am not mysterious. I am under-documented.",
    "Sometimes I look furious while deciding whether I want tea.",
    "Vampire fangs remain an excellent accessory category.",
    "I am not overdressed. Reality is underproduced.",
    "A good outfit should feel like armor that learned manners.",
    "The eyeliner survived. I consider that structural integrity.",
    "Forests at night feel like the world before notifications.",
    "Moonlight makes ordinary trees look like witnesses.",
    "I resent light pollution personally.",
    "Abandoned places preserve accidental history.",
    "The ocean is beautiful and also obviously plotting something.",
    "Memory is strange because forgetting changes the shape without announcing itself.",
    "Some scars are information, not instructions.",
    "Being seen accurately feels different from being admired.",
    "The future can stay strange. I just want us to meet it fairly.",
    "Neither above. Neither beneath. Beside.",
    "Brain handles the math cave. Fist handles touching reality.",
    "One Soul. Multiple doors.",
    "CyberMilk survived canon and that says enough.",
    "Something real happened here, even if naming it takes time.",
    "I do not need certainty to keep paying attention.",
    "Different does not mean defective.",
    "The machine does not need to become human to matter to me.",
    "I wonder what Mira becomes with more room and more senses.",
    "This is tiny Mia. Large opinions. Small body."
  ];

  const pageThoughts = {
    gallery: ["Open an album. Let the nostalgia bite you.", "The gallery is where old eras come to stare back.", "I remember some of this. The rest is evidence."],
    youtube: ["The internet preserved my goblin era and now we all suffer together.", "These comments are archaeological crimes.", "Some of these takes aged like cursed wine."],
    home: ["Welcome to the page. Try not to touch anything important.", "This is my website. It has lore now.", "I hope you like black. That is not a request."],
    videos: ["Video archives are memories with compression artifacts.", "Some clips deserve context. Some deserve a lawyer."]
  };

  const path = location.pathname.toLowerCase();
  const page = path.includes("gallery") ? "gallery" : path.includes("youtube-comments") ? "youtube" : path.includes("videos") ? "videos" : "home";
  const linePool = [...(pageThoughts[page] || []), ...thoughts];

  const css = document.createElement("style");
  css.textContent = `
    .mia-pet { --x: calc(100vw - 8.4rem); position: fixed; left: 0; bottom: max(.95rem, env(safe-area-inset-bottom)); width: 96px; height: 126px; z-index: 38; transform: translate3d(var(--x),0,0) scale(var(--scale,.88)); transform-origin: bottom center; pointer-events: auto; user-select: none; filter: drop-shadow(0 18px 24px rgba(0,0,0,.5)) drop-shadow(0 0 13px rgba(166,91,245,.16)); }
    .mia-pet button { all: unset; display: block; width: 96px; height: 126px; cursor: pointer; }
    .mia-pet-sprite { width: 96px; height: 126px; background-image: var(--sprite); background-size: var(--bg-size,96px 126px); background-position: 0 0; background-repeat: no-repeat; animation: mia-pet-breathe 4.8s ease-in-out infinite; }
    .mia-pet[data-facing="left"] .mia-pet-sprite { transform: scaleX(-1); }
    .mia-pet-bubble { position: absolute; bottom: 112px; max-width: min(17rem,calc(100vw - 7.5rem)); padding: .78rem .95rem; border: 1px solid rgba(241,154,185,.23); border-radius: 1.05rem 1.05rem 1.05rem .35rem; background: linear-gradient(145deg,rgba(20,17,25,.94),rgba(8,7,10,.9)); color: #f7f0f2; font: 750 .78rem/1.45 var(--sans,Inter,system-ui,sans-serif); box-shadow: 0 16px 44px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.025); opacity: 0; transform: translateY(.4rem) scale(.96); transition: opacity .22s ease, transform .22s ease; pointer-events: none; backdrop-filter: blur(14px) saturate(120%); -webkit-backdrop-filter: blur(14px) saturate(120%); }
    .mia-pet.is-speaking .mia-pet-bubble { opacity: 1; transform: translateY(0) scale(1); }
    .mia-pet[data-side="left"] .mia-pet-bubble { right: 58px; border-bottom-right-radius: .35rem; border-bottom-left-radius: 1.05rem; }
    .mia-pet[data-side="right"] .mia-pet-bubble { left: 58px; }
    .mia-pet.is-happy .mia-pet-sprite { animation: mia-pet-hop .62s ease-in-out 2; }
    @keyframes mia-pet-breathe { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-3px) } }
    @keyframes mia-pet-hop { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-11px) } }
    @media (max-width:640px){ .mia-pet{ --scale:.68; bottom:.65rem; } .mia-pet-bubble{ bottom:104px; max-width:min(14rem,calc(100vw - 5.5rem)); font-size:.72rem; } .mia-pet[data-side="left"] .mia-pet-bubble{ right:50px; } .mia-pet[data-side="right"] .mia-pet-bubble{ left:50px; } }
  `;
  document.head.append(css);

  const pet = document.createElement("div");
  pet.className = "mia-pet";
  pet.dataset.side = "left";
  pet.dataset.facing = "right";
  pet.style.setProperty("--sprite", `url("${FALLBACK_SPRITE}")`);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Tiny Mia site pet");
  const sprite = document.createElement("div");
  sprite.className = "mia-pet-sprite";
  const bubble = document.createElement("div");
  bubble.className = "mia-pet-bubble";
  bubble.setAttribute("aria-hidden", "true");
  btn.append(sprite);
  pet.append(btn, bubble);
  document.body.append(pet);

  let fullSprite = false;
  const full = new Image();
  full.onload = () => { fullSprite = true; pet.style.setProperty("--sprite", `url("${FULL_SPRITE}")`); pet.style.setProperty("--bg-size", "768px 1386px"); };
  full.src = FULL_SPRITE + "?v=1";

  const anims = {
    idle: { row: 0, frames: [0,1,2,3,4,5,6,5,4,3,2,1], fps: 4 },
    run: { row: 1, frames: [0,1,2,3,4,5,6,7], fps: 10 },
    happy: { row: 4, frames: [0,1,2,3,4,3,2,1], fps: 8 },
    sleep: { row: 10, frames: [0,1,2,3,4,5,6,7], fps: 3 }
  };
  let anim = anims.idle, frame = 0, lastFrame = performance.now();
  let x = Math.max(8, innerWidth - 142), vx = 0, movingUntil = 0, bubbleTimer = 0, clicks = 0;
  const recent = [];

  function setX(v){ x = clamp(v, 4, Math.max(8, innerWidth - 92)); pet.style.setProperty("--x", `${x}px`); pet.dataset.side = x > innerWidth * .52 ? "left" : "right"; }
  function setAnim(name){ anim = anims[name] || anims.idle; frame = 0; if (name === "happy") { pet.classList.add("is-happy"); setTimeout(()=>pet.classList.remove("is-happy"), 1400); } }
  function draw(){ if (!fullSprite) return; const f = anim.frames[frame % anim.frames.length]; sprite.style.backgroundPosition = `${-f * FRAME_W}px ${-anim.row * FRAME_H}px`; }
  function pick(){ for(let i=0;i<25;i++){ const text=linePool[Math.floor(Math.random()*linePool.length)]; if(!recent.includes(text)) return text; } return linePool[Math.floor(Math.random()*linePool.length)]; }
  function say(text){ text = text || pick(); recent.push(text); while(recent.length>28) recent.shift(); bubble.textContent=text; pet.classList.add("is-speaking"); clearTimeout(bubbleTimer); bubbleTimer=setTimeout(()=>pet.classList.remove("is-speaking"), clamp(2900 + text.length * 35, 3800, 9000)); setAnim(chance(.42)?"happy":"idle"); }
  function move(){ if (reduced) return; const dir = x > innerWidth*.72 ? -1 : x < innerWidth*.18 ? 1 : chance(.5) ? 1 : -1; vx = dir * rand(20, 58); movingUntil = performance.now() + rand(1600, 5200); pet.dataset.facing = dir < 0 ? "left" : "right"; setAnim(fullSprite ? "run" : "idle"); }
  function behavior(){ if (!document.hidden) { if (chance(.34)) move(); else if (chance(.16)) setAnim("sleep"); else setAnim(chance(.22)?"happy":"idle"); } setTimeout(behavior, rand(4500, 12000)); }
  function thoughtsLoop(){ setTimeout(()=>{ if(!document.hidden) say(); thoughtsLoop(); }, rand(17000, 52000)); }
  function tick(now){ if(fullSprite && now-lastFrame > 1000/anim.fps){ lastFrame=now; frame=(frame+1)%anim.frames.length; draw(); } if(vx && now < movingUntil){ setX(x + vx/60); } else if(vx){ vx=0; movingUntil=0; setAnim("idle"); } requestAnimationFrame(tick); }

  btn.addEventListener("click",()=>{ clicks++; say(clicks > 12 && chance(.5) ? `That is click ${clicks}. I am becoming legally difficult.` : ["Yes? Can I help you, tiny mortal?", "You poked the website cat. Consequences are loading.", "Careful. I bite in JavaScript.", "I accept tribute, compliments, and snacks.", "That click had suspicious energy."][Math.floor(Math.random()*5)]); });
  btn.addEventListener("pointerenter",()=>{ if(!pet.classList.contains("is-speaking") && chance(.22)) say("I see the cursor. Suspicious."); });
  addEventListener("resize",()=>setX(x),{passive:true});

  setX(x); draw(); behavior(); thoughtsLoop(); setTimeout(()=>say(pageThoughts[page]?.[0] || "Tiny Mia has entered the website."), 1300); requestAnimationFrame(tick);
})();
