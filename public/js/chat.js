(() => {
  const messagesEl = document.getElementById("messages");
  const quickEl = document.getElementById("quick");
  const form = document.getElementById("composer");
  const input = document.getElementById("input");

  /* ---------- helpers ---------- */
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // escape, then turn *bold* into <strong>, and newlines into <br>
  function format(text) {
    return escapeHtml(text)
      .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(text, who, paymentUrl) {
    const row = document.createElement("div");
    row.className = `row ${who}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = who === "bot" ? "🍲" : "🧑";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = format(text);

    if (paymentUrl) {
      const btn = document.createElement("a");
      btn.className = "pay-btn";
      btn.href = paymentUrl;
      btn.innerHTML = "💳 Pay with Paystack";
      bubble.appendChild(document.createElement("br"));
      bubble.appendChild(btn);
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function showTyping() {
    const row = document.createElement("div");
    row.className = "row bot typing";
    row.id = "typing";
    row.innerHTML =
      '<div class="avatar">🍲</div><div class="bubble"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(row);
    scrollToBottom();
  }
  function hideTyping() {
    const t = document.getElementById("typing");
    if (t) t.remove();
  }

  function renderQuick(replies) {
    quickEl.innerHTML = "";
    (replies || []).forEach((label) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = label;
      chip.addEventListener("click", () => send(label));
      quickEl.appendChild(chip);
    });
  }

  // Render a bot response (possibly several bubbles) with a small typing delay.
  async function renderBot(data) {
    const replies = data.replies || [];
    for (let i = 0; i < replies.length; i++) {
      showTyping();
      await wait(380);
      hideTyping();
      const isLast = i === replies.length - 1;
      addMessage(replies[i], "bot", isLast ? data.paymentUrl : undefined);
      await wait(120);
    }
    renderQuick(data.quickReplies);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- network ---------- */
  async function send(text) {
    const message = (text != null ? text : input.value).trim();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";
    quickEl.innerHTML = "";

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      await renderBot(data);
    } catch (e) {
      hideTyping();
      addMessage("⚠️ Network error. Please try again.", "bot");
    }
  }

  async function init() {
    try {
      const res = await fetch("/api/chat/init", { credentials: "include" });
      const data = await res.json();
      await renderBot(data);
    } catch (e) {
      addMessage("⚠️ Couldn't reach the kitchen. Refresh to retry.", "bot");
    }
  }

  /* ---------- events ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send();
  });

  init();
})();
