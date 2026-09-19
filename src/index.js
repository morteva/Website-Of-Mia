const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/contact") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return reply({ success: false, message: "Method not allowed." }, 405);
    }

    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) {
      return reply({ success: false, message: "Request rejected." }, 403);
    }

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 16000) {
      return reply({ success: false, message: "Message is too large." }, 413);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return reply({ success: false, message: "Invalid request." }, 400);
    }

    if (clean(data.website, 200)) {
      return reply({ success: true, message: "Message sent." });
    }

    const name = clean(data.name, 120);
    const email = clean(data.email, 254);
    const subject = clean(data.subject, 160);
    const message = clean(data.message, 5000);
    const consent = data.consent === true;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ success: false, message: "Please enter a valid email address." }, 400);
    }
    if (!message) {
      return reply({ success: false, message: "Please write a message first." }, 400);
    }
    if (!consent) {
      return reply({ success: false, message: "Please confirm that you read the disclaimer." }, 400);
    }
    if (!env.CONTACT_EMAIL) {
      return reply({ success: false, message: "Delivery is not configured yet." }, 503);
    }

    const relayPayload = {
      name: name || "Anonymous",
      email,
      subject: subject || "A Quiet Hello",
      message,
      _subject: subject ? `A Quiet Hello: ${subject}` : "A Quiet Hello",
      _template: "table",
      _url: `${url.origin}/hello.html`
    };

    let relayResponse;
    try {
      relayResponse = await fetch(`https://formsubmit.co/ajax/${env.CONTACT_EMAIL}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify(relayPayload)
      });
    } catch {
      return reply({ success: false, message: "Delivery failed. Please try again later." }, 502);
    }

    let relayResult = {};
    try {
      relayResult = await relayResponse.json();
    } catch {}

    if (!relayResponse.ok || relayResult.success === false) {
      return reply({
        success: false,
        message: relayResult.message || "Delivery failed. Please try again later."
      }, 502);
    }

    return reply({ success: true, message: "Message sent." });
  }
};
