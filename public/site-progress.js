document.querySelectorAll('.site-progress').forEach(box => {
  const label = document.createElement('span');
  label.textContent = box.textContent;
  const bar = document.createElement('progress');
  bar.max = 100;
  bar.value = 52;
  bar.setAttribute('aria-label', 'Site progress');
  box.replaceChildren(label, bar);
  fetch('/site-progress.json', {cache:'no-store'})
    .then(response => { if (!response.ok) throw Error('Progress unavailable'); return response.json(); })
    .then(data => {
      if (!Number.isFinite(data.percent) || data.percent < 52 || data.percent > 100) return;
      label.textContent = `Site Progress: ${data.percent.toFixed(1)}% Complete`;
      bar.value = data.percent;
    })
    .catch(() => {});
});
