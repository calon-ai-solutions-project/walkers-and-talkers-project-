const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");
const { NFC } = require("nfc-pcsc");

let win = null;
let reader = null;
let cardOn = false;
let job = null; // { kind: 'write'|'read', token, url, api, key }

// ---------------------------------------------------------------- UI bridge
function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}
function status(state, message, extra = {}) {
  send("status", { state, message, ...extra });
}

// ---------------------------------------------------------------- NDEF
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
  const record = Buffer.concat([Buffer.from([0xd1, 0x01, payload.length, 0x55]), payload]);
  let tlv;
  if (record.length < 255) {
    tlv = Buffer.concat([Buffer.from([0x03, record.length]), record, Buffer.from([0xfe])]);
  } else {
    const len = record.length;
    tlv = Buffer.concat([Buffer.from([0x03, 0xff, (len >> 8) & 0xff, len & 0xff]), record, Buffer.from([0xfe])]);
  }
  const pad = (4 - (tlv.length % 4)) % 4;
  return Buffer.concat([tlv, Buffer.alloc(pad, 0x00)]);
}

const PREFIX_TABLE = ["", "http://www.", "https://www.", "http://", "https://"];
function parseNdefUri(buf) {
  // Find NDEF TLV (0x03) in the dump, then the URI ('U') record.
  let i = 0;
  while (i < buf.length) {
    const t = buf[i];
    if (t === 0x00) { i += 1; continue; }
    if (t === 0xfe) break;
    const len = buf[i + 1];
    const value = buf.slice(i + 2, i + 2 + len);
    if (t === 0x03) {
      // NDEF record: header, typeLen, payloadLen, type, payload
      const payloadLen = value[2];
      const type = value[3];
      if (type === 0x55) {
        const payload = value.slice(4, 4 + payloadLen);
        const prefix = PREFIX_TABLE[payload[0]] ?? "";
        return prefix + payload.slice(1).toString("utf8");
      }
    }
    i += 2 + len;
  }
  return null;
}

// ---------------------------------------------------------------- NFC ops
async function writeUrl(url) {
  const data = buildNdefUriTlv(url);
  for (let i = 0; i < data.length; i += 4) {
    const page = 4 + i / 4;
    const apdu = Buffer.concat([
      Buffer.from([0xff, 0x00, 0x00, 0x00, 0x07, 0xd4, 0x40, 0x01, 0xa2, page]),
      data.slice(i, i + 4),
    ]);
    const resp = await reader.transmit(apdu, 40);
    const ok =
      resp.indexOf(Buffer.from([0xd5, 0x41, 0x00])) !== -1 ||
      (resp[resp.length - 2] === 0x90 && resp[resp.length - 1] === 0x00);
    if (!ok) throw new Error(`page ${page} rejected (${resp.toString("hex")})`);
  }
}

async function readDump(pages = 36) {
  // Read 4 pages (16 bytes) at a time with NTAG READ (0x30) via PN532.
  const chunks = [];
  for (let page = 4; page < 4 + pages; page += 4) {
    const apdu = Buffer.from([0xff, 0x00, 0x00, 0x00, 0x05, 0xd4, 0x40, 0x01, 0x30, page]);
    const resp = await reader.transmit(apdu, 40);
    const idx = resp.indexOf(Buffer.from([0xd5, 0x41, 0x00]));
    if (idx === -1) break;
    chunks.push(resp.slice(idx + 3, idx + 3 + 16));
  }
  return Buffer.concat(chunks);
}

async function callRpc(api, key, fn, body) {
  const res = await fetch(`${api.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${fn} ${res.status}`);
  return res.json();
}

async function runJob() {
  if (!job || !reader) return;
  const current = job;
  job = null;
  try {
    if (current.kind === "write") {
      status("writing", "Writing card…");
      await writeUrl(current.url);
      if (current.api && current.key && current.token) {
        try {
          await callRpc(current.api, current.key, "activate_card_by_token", { p_token: current.token });
        } catch (e) {
          // Card is written; activation can be retried in the portal.
          console.error("activate failed:", e.message);
        }
      }
      status("success", "Card written and activated. Remove it.");
    } else if (current.kind === "read") {
      status("reading", "Reading card…");
      const dump = await readDump();
      const url = parseNdefUri(dump);
      if (current.api && current.key && current.token) {
        callRpc(current.api, current.key, "log_card_read", { p_token: current.token }).catch(() => {});
      }
      status("success", url ? `Read: ${url}` : "Read complete (no URL found).", { url });
    }
  } catch (e) {
    status("error", e.message);
  }
}

function startNfc() {
  const nfc = new NFC();
  nfc.on("reader", (r) => {
    reader = r;
    status("reader-connected", `Reader connected: ${r.reader.name}`);
    r.on("card", () => {
      cardOn = true;
      if (job) void runJob();
      else status("card-present", "Card on reader.");
    });
    r.on("card.off", () => {
      cardOn = false;
    });
    r.on("end", () => {
      if (reader === r) { reader = null; cardOn = false; }
      status("reader-disconnected", "Reader disconnected.");
    });
    r.on("error", (e) => status("error", e.message));
  });
  nfc.on("error", (e) => status("error", `NFC: ${e.message}`));
}

// ---------------------------------------------------------------- deep link
function parseDeepLink(link) {
  try {
    const u = new URL(link);
    const kind = u.hostname || u.pathname.replace(/\//g, "") || "write";
    const q = u.searchParams;
    return {
      kind: kind === "read" ? "read" : "write",
      token: q.get("token") || q.get("cardToken") || "",
      url: q.get("url") || "",
      api: q.get("api") || "",
      key: q.get("key") || "",
    };
  } catch {
    return null;
  }
}

function handleDeepLink(link) {
  const parsed = parseDeepLink(link);
  if (!parsed) return;
  job = parsed;
  status("waiting", parsed.kind === "read" ? "Place the card to read…" : "Place a blank card on the reader…", {
    token: parsed.token,
  });
  if (win) { win.show(); win.focus(); }
  if (cardOn && reader) void runJob();
}

// ---------------------------------------------------------------- app
function createWindow() {
  win = new BrowserWindow({
    width: 460,
    height: 600,
    resizable: false,
    title: "Walkers & Talkers NFC Writer",
    webPreferences: { preload: path.join(__dirname, "preload.cjs") },
  });
  win.loadFile(path.join(__dirname, "index.html"));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    const link = argv.find((a) => a.startsWith("nfcwriter://"));
    if (link) handleDeepLink(link);
    if (win) { win.show(); win.focus(); }
  });

  app.on("open-url", (e, link) => {
    e.preventDefault();
    handleDeepLink(link);
  });

  app.whenReady().then(() => {
    if (process.defaultApp) {
      app.setAsDefaultProtocolClient("nfcwriter", process.execPath, [path.resolve(process.argv[1] ?? ".")]);
    } else {
      app.setAsDefaultProtocolClient("nfcwriter");
    }
    createWindow();
    startNfc();

    // Cold-start deep link (Windows/Linux pass it in argv)
    const link = process.argv.find((a) => a.startsWith("nfcwriter://"));
    if (link) handleDeepLink(link);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

// Manual actions from the UI
ipcMain.handle("manual-write", (_e, { url, token, api, key }) => {
  job = { kind: "write", url, token, api, key };
  status("waiting", "Place a blank card on the reader…", { token });
  if (cardOn && reader) void runJob();
});
ipcMain.on("open-external", (_e, url) => shell.openExternal(url));
