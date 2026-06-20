/**
 * Write a Walkers & Talkers check-in URL to an NTAG card with an ACR122U.
 *
 *   node write-card.mjs "https://your-site.vercel.app/c/abc123token"
 *
 * Hold a blank NTAG213/215/216 card on the reader when prompted. The script
 * writes an NDEF URL record so tapping the card on any phone opens that URL.
 *
 * After writing, mark the card "active" in the app (Cards -> Program ->
 * Copy URL tab -> "Mark card active"), or it won't check anyone in.
 */
import { NFC } from "nfc-pcsc";

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) {
  console.error('Usage: node write-card.mjs "https://your-site/c/<token>"');
  process.exit(1);
}

// Build an NDEF "URI" record wrapped in a Type-2-tag TLV, padded to 4 bytes.
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
  // Short NDEF record: MB+ME+SR, TNF=well-known(0x01), type 'U' (0x55)
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

const data = buildNdefUriTlv(url);
console.log(`Ready to write ${data.length} bytes for: ${url}`);
console.log("Hold a blank NTAG card on the ACR122U…");

const nfc = new NFC();

nfc.on("reader", (reader) => {
  console.log(`Reader detected: ${reader.reader.name}`);

  reader.on("card", async () => {
    try {
      // NTAG WRITE (0xA2) via PN532 InDataExchange — reliable on ACR122U.
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
      console.log("✅ Card written. Remove it. (Now mark it active in the app.)");
    } catch (e) {
      console.error("❌ Write failed:", e.message);
      console.error("   Is the card NTAG213/215/216 and blank/rewritable?");
    }
  });

  reader.on("error", (err) => console.error("Reader error:", err.message));
  reader.on("end", () => console.log("Reader removed."));
});

nfc.on("error", (err) => console.error("NFC error:", err.message));
