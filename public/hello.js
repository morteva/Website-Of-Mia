(() => {
  const form = document.getElementById("quiet-hello-form");
  const status = document.getElementById("hello-status");
  const button = form?.querySelector(".hello-submit");

  if (!form || !status || !button) return;

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
    const payload = {
      name: formData.get("name") || "",
      email: formData.get("email") || "",
      subject: formData.get("subject") || "",
      message: formData.get("message") || "",
      website: formData.get("website") || "",
      consent: formData.get("consent") === "on"
    };

    button.disabled = true;
    button.textContent = "Sending…";
    setStatus("Sending…");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json"
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
