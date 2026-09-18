const collapsibleSelector = ".bio-details, .passion-panel-sample";
const openCollapsibleSelector = ".bio-details[open], .passion-panel-sample[open]";

document.addEventListener("click", (event) => {
  if (event.target.closest(collapsibleSelector)) return;

  document.querySelectorAll(openCollapsibleSelector).forEach((details) => {
    details.open = false;
  });
});

document.addEventListener("dblclick", (event) => {
  const openPanel = event.target.closest(openCollapsibleSelector);
  if (!openPanel) return;

  // Leave normal controls alone if we add links/buttons/forms inside a panel.
  if (event.target.closest("a, button, input, textarea, select, label")) return;

  openPanel.open = false;
});
