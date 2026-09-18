document.addEventListener("click", (event) => {
  if (event.target.closest(".bio-details")) return;

  document.querySelectorAll(".bio-details[open]").forEach((details) => {
    details.open = false;
  });
});

document.addEventListener("dblclick", (event) => {
  const openPanel = event.target.closest(".bio-details[open]");
  if (!openPanel) return;

  // Leave normal controls alone if we ever add links/buttons/forms inside a panel.
  if (event.target.closest("a, button, input, textarea, select, label")) return;

  openPanel.open = false;
});
