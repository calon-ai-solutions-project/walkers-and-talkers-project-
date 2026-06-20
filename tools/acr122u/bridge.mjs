/**
 * Local ACR122U bridge for the Walkers & Talkers portal.
 *
 * Run this on the computer that has the ACR122U plugged in:
 *   cd tools/acr122u && npm install && npm start
 *
 * It listens on http://127.0.0.1:8899. The portal's "USB Reader" tab posts the
 * card URL here; you hold a blank NTAG card on the reader and it writes it.
 * Keep this window open while programming cards.
 */
import http from "node:http";
import { NFC } from "nfc-pcsc";

const PORT = 8899;

function buildNdefUriTlv(fullUrl) {
  const prefixes = [
    [0x04, "https://"],
    [0x03, "http://"],
    [0x02, "https://www."],
    [0x01, "http://www."],
  ];
  let prefixCode = 0x00;
  let rest = fullUrl;
  for (const [code, p] of prefixes) {
    if (fullUrl.startsWith(p)) {
      prefixCode = code;
      rest = fullUrl.slice(p.length);
      break;
    }
  }
  const payload = Buffer.concat([Buffer.from([prefixCode]), Buffer.from(rest, "utf8")]);
  const record = Buffer.concat([
    Buffer.from([0xd1, 0x01, payload.length, 0x55]),
    payload,
  ]);
  let tlv;
  if (record.length < 255) {
    tlv = Buffer.concat([Buffer.from([0x03, record.length]), record, Buffer.from([0xfe])]);
  } else {
    const len = record.length;
    tlv = Buffer.concat([
      Buffer.from([0x03, 0xff, (len >> 8) & 0xff, len & 0xff]),
      record,
      Buffer.from([0xfe]),
    ]);
  }
  const pad = (4 - (tlv.length % 4)) % 4;
  return Buffer.concat([tlv, Buffer.alloc(pad, 0x00)]);
}

let reader = null;
let pending = null; // { data, resolve, reject, timer }

function checkResp(resp, page) {
  const hex = resp.toString("hex");
  const okPn532 = resp.indexOf(Buffer.from([0xd5, 0x41, 0x00])) !== -1;
  const ok9000 = resp.length >= 2 && resp[resp.length - 2] === 0x90 && resp[resp.length - 1] === 0x00;
  if (!okPn532 && !ok9000) throw new Error(`page ${page} write rejected (resp ${hex})`);
}

async function writeCard(card) {
  if (!pending) {
    console.log(
      `Card detected (${card?.uid ?? "no-uid"}) but no write requested yet — ` +
        "click 'Write to card' in the app first, then tap.",
    );
    return;
  }
  const { data, resolve, reject, timer } = pending;
  pending = null;
  clearTimeout(timer);
  try {
    console.log(`Card detected (${card?.uid ?? "no-uid"}) — writing ${data.length} bytes…`);
    for (let i = 0; i < data.length; i += 4) {
      const page = 4 + i / 4;
      const apdu = Buffer.concat([
        Buffer.from([0xff, 0x00, 0x00, 0x00, 0x07, 0xd4, 0x40, 0x01, 0xa2, page]),
        data.slice(i, i + 4),
      ]);
      const resp = await reader.transmit(apdu, 40);
      checkResp(resp, page);
    }
    console.log("✅ Written.");
    resolve();
  } catch (e) {
    console.error("❌ Write failed:", e.message);
    reject(e);
  }
}

const nfc = new NFC();
nfc.on("reader", (r) => {
  reader = r;
  console.log(`Reader connected: ${r.reader.name}`);
  r.on("card", (card) => void writeCard(card));
  r.on("end", () => {
    if (reader === r) reader = null;
    console.log("Reader removed.");
  });
  r.on("error", (e) => console.error("Reader error:", e.message));
});
nfc.on("error", (e) => console.error("NFC error:", e.message));

function writeOnNextCard(url, timeoutMs = 40000) {
  return new Promise((resolve, reject) => {
    if (!reader) return reject(new Error("No ACR122U reader connected"));
    const data = buildNdefUriTlv(url);
    const timer = setTimeout(() => {
      pending = null;
      reject(new Error("Timed out — no card tapped. Click Write, THEN place the card (lift & retap if it was already on the reader)."));
    }, timeoutMs);
    pending = { data, resolve, reject, timer };
    console.log("Ready — tap a blank NTAG card on the reader now.");
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

http
  .createServer((req, res) => {
    cors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    if (req.url.startsWith("/health")) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: true, reader: reader?.reader.name ?? null }));
    }
    if (req.method === "POST" && req.url.startsWith("/write")) {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        try {
          const { url } = JSON.parse(body || "{}");
          if (!url) throw new Error("Missing url");
          console.log("Waiting for a card to write:", url);
          await writeOnNextCard(url);
          console.log("✅ Written.");
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ status: "ok" }));
        } catch (e) {
          console.error("Write failed:", e.message);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ status: "error", message: e.message }));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end();
  })
  .listen(PORT, "127.0.0.1", () =>
    console.log(
      `ACR122U bridge running on http://127.0.0.1:${PORT}\n` +
        "Leave this open. In the portal, open a card → 'USB Reader' tab → Write to card.",
    ),
  );
