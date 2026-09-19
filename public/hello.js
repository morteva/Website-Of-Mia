(() => {
  const form = document.getElementById("quiet-hello-form");
  const status = document.getElementById("hello-status");
  const button = form?.querySelector(".hello-submit");

  if (!form || !status || !button) return;

  const disclaimer = document.getElementById("hello-disclaimer");
  const disclaimerJump = document.querySelector(".hello-disclaimer-jump");

  disclaimerJump?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!disclaimer) return;

    disclaimer.open = true;
    disclaimer.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(() => {
      disclaimer.querySelector("summary")?.focus({ preventScroll: true });
    }, 450);
  });

  function setStatus(message, state = "") {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);

    if (String(formData.get("website") || "").trim()) {
      form.reset();
      setStatus("Message sent. Thank you for trusting me with it.", "success");
      return;
    }

    formData.delete("website");

    const subject = String(formData.get("subject") || "").trim();
    if (!subject) formData.set("subject", "A Quiet Hello");

    const payload = Object.fromEntries(formData.entries());

    button.disabled = true;
    button.textContent = "Sending…";
    setStatus("Sending…");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Something went wrong.");
      }

      form.reset();
      setStatus("Message sent. Thank you for trusting me with it.", "success");
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please try again.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Send message";
    }
  });
})();
