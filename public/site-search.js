(() => {
  'use strict';

  if (window.__googleSiteSearchInstalled) return;
  window.__googleSiteSearchInstalled = true;

  const header = document.querySelector('header');
  if (!header) return;

  let canonicalHost = '';
  try {
    const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
    canonicalHost = new URL(canonical).hostname.replace(/^www\./, '');
  } catch {
    canonicalHost = window.location.hostname.replace(/^www\./, '');
  }

  const site = {
    'morteva.com': { label: 'Mia', placeholder: "Search Mia's site" },
    'thisisbeside.org': { label: 'Beside', placeholder: 'Search Beside' },
  }[canonicalHost];

  if (!site) return;

  const mount = header.querySelector('.nav') || header;
  if (mount.querySelector('[data-google-site-search-ui]')) return;

  const shell = document.createElement('div');
  shell.className = 'google-site-search';
  shell.dataset.googleSiteSearchUi = '';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'google-site-search__toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', `Search ${site.label} with Google`);
  toggle.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.5"></circle>
      <path d="M16 16l5 5"></path>
    </svg>
    <span>Search</span>
  `;

  const panel = document.createElement('form');
  panel.className = 'google-site-search__panel';
  panel.setAttribute('role', 'search');
  panel.setAttribute('aria-label', `Search ${site.label} with Google`);

  const label = document.createElement('label');
  label.className = 'google-site-search__label';
  label.textContent = `Search ${site.label}`;

  const row = document.createElement('div');
  row.className = 'google-site-search__row';

  const input = document.createElement('input');
  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = true;
  input.placeholder = site.placeholder;
  input.setAttribute('aria-label', site.placeholder);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Search';

  const note = document.createElement('small');
  note.textContent = `Google results limited to ${canonicalHost}`;

  row.append(input, submit);
  panel.append(label, row, note);
  shell.append(toggle, panel);
  mount.append(shell);

  const setOpen = (open) => {
    shell.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(() => input.focus());
  };

  toggle.addEventListener('click', () => setOpen(!shell.classList.contains('is-open')));

  panel.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }

    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`site:${canonicalHost} ${query}`)}`;
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
    setOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (!shell.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && shell.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();