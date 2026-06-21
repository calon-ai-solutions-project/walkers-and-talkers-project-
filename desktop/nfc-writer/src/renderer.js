const emoji = document.getElementById("emoji");
const title = document.getElementById("title");
const msg = document.getElementById("msg");
const tokenEl = document.getElementById("token");
const readerDot = document.getElementById("readerDot");
const readerText = document.getElementById("readerText");

const VIEW = {
  waiting: { emoji: "⏳", title: "Place the card" },
  writing: { emoji: "✍️", title: "Writing…" },
  reading: { emoji: "📖", title: "Reading…" },
  success: { emoji: "✅", title: "Done" },
  error: { emoji: "⚠️", title: "Error" },
  "card-present": { emoji: "💳", title: "Card ready" },
};

window.nfc.onStatus((s) => {
  // Reader connection messages
  if (s.state === "reader-connected") {
    readerDot.className = "dot ok";
    readerText.textContent = s.message;
    return;
  }
  if (s.state === "reader-disconnected") {
    readerDot.className = "dot bad";
    readerText.textContent = "Reader disconnected — plug in the ACR122U.";
    return;
  }

  const v = VIEW[s.state];
  if (v) {
    emoji.textContent = v.emoji;
    title.textContent = v.title;
  }
  if (s.message) msg.textContent = s.message;
  if (s.token) tokenEl.textContent = "card: " + s.token;
});
