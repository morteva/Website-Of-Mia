document.addEventListener("click", (event) => {
  if (event.target.closest(".bio-details")) return;

  document.querySelectorAll(".bio-details[open]").forEach((details) => {
    details.open = false;
  });
});
