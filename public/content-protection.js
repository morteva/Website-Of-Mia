(() => {
  'use strict';

  if (window.__contentProtectionInstalled) return;
  window.__contentProtectionInstalled = true;

  const isEditable = (target) => {
    const el = target instanceof Element ? target : null;
    return !!el?.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
  };

  const style = document.createElement('style');
  style.textContent = `
    html, body, body * {
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }

    input, textarea, select,
    [contenteditable="true"], [contenteditable=""],
    [role="textbox"] {
      -webkit-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;
    }

    img, picture, video, canvas, svg {
      -webkit-user-drag: none;
      user-drag: none;
    }
  `;
  document.head.append(style);

  document.addEventListener('contextmenu', (event) => {
    if (isEditable(event.target)) return;
    event.preventDefault();
  }, true);

  document.addEventListener('selectstart', (event) => {
    if (isEditable(event.target)) return;
    event.preventDefault();
  }, true);

  document.addEventListener('copy', (event) => {
    if (isEditable(event.target)) return;
    event.preventDefault();
  }, true);

  document.addEventListener('cut', (event) => {
    if (isEditable(event.target)) return;
    event.preventDefault();
  }, true);

  document.addEventListener('dragstart', (event) => {
    if (isEditable(event.target)) return;
    event.preventDefault();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (isEditable(event.target)) return;

    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;

    if (
      (modifier && ['a', 'c', 'p', 's', 'u'].includes(key)) ||
      event.key === 'F12' ||
      (event.shiftKey && event.key === 'F10') ||
      (modifier && event.shiftKey && ['c', 'i', 'j'].includes(key))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  const lockMedia = (root = document) => {
    root.querySelectorAll?.('img, picture, video, canvas, svg').forEach((el) => {
      if ('draggable' in el) el.draggable = false;
    });
  };

  lockMedia();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('img, picture, video, canvas, svg') && 'draggable' in node) node.draggable = false;
        lockMedia(node);
      }
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();