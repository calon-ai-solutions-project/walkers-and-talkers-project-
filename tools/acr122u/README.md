# Writing cards with an ACR122U (desktop)

**Why this exists:** the portal's "Write to card" button uses **Web NFC**, which
only works on **Android phones in Chrome**. It cannot talk to a USB reader like
the **ACR122U**. To write cards from a computer with the ACR122U, use this small
helper script (or the no-code app in the last section).

What it does: writes the same `https://your-site/c/<token>` URL onto a blank
**NTAG213/215/216** card as an NDEF record, so tapping it on any phone opens the
check-in page — exactly like the phone-written cards.

---

## 1. Plug in the reader + drivers

- **Windows:** works out of the box (CCID driver). If not, install the ACS
  "ACR122U PICC" driver from the ACS website.
- **macOS:** the reader is detected via the built-in PC/SC stack. If writes hang,
  the macOS "ifdreader" can grab the device — install ACS's macOS driver, or
  free the device so `pcsc` can use it.
- **Linux:** install PC/SC + the ACS driver:
  ```bash
  sudo apt-get install pcscd pcsc-tools libacsccid1
  sudo systemctl enable --now pcscd
  ```
  Test with `pcsc_scan` — it should show the reader and react when you place a card.

## 2. Install the script's dependency

You need Node 20+ and build tools (the `nfc-pcsc` package builds a native addon).

```bash
cd tools/acr122u
npm install
```
- macOS: needs Xcode command line tools (`xcode-select --install`).
- Windows: needs "Desktop development with C++" (Visual Studio Build Tools).
- Linux: `sudo apt-get install build-essential libpcsclite-dev`.

## ⭐ Easiest: the in-app "USB Reader" button

Instead of running the writer per card, start the **bridge** once and use the
portal's button:

```bash
cd tools/acr122u
npm install      # one time
npm start        # leave this window open
```

Then in the portal: open a card → **Program → "USB Reader" tab → "Write to card
(USB reader)"** → hold a blank card on the ACR122U. It writes **and** marks the
card active automatically. Keep the `npm start` window open while you program
cards.

(The button talks to `http://127.0.0.1:8899`, which the bridge serves locally.)

---

## 3. Get the card's URL from the app (manual writer)

1. In the portal: **Members → a member → Issue new card** (or **Cards → Program**).
2. On the Card Programmer, open the **Copy URL** tab and **copy** the URL
   (looks like `https://your-site.vercel.app/c/abc123token`).

## 4. Write the card

```bash
npm run write -- "https://your-site.vercel.app/c/abc123token"
```
Then place a blank NTAG card on the reader. You'll see **"✅ Card written"**.

## 5. Activate the card

The script only writes the chip. In the portal, on that card's **Program** page
→ **Copy URL** tab → click **"Mark card active"** (or it stays `pending`).
Then tapping the card during an **open** session checks the member in.

## 6. Reprogramming / fixing a mistake

NTAG cards are rewritable — just run the script again with a new URL to
overwrite. If you wrote the wrong URL: in the app **Revoke** that card (reason
"Wrong URL written"), **Issue a new card**, and write the new URL to the same
physical chip.

---

## Troubleshooting

- **"No reader" / nothing happens** → driver not installed or `pcscd` not
  running. On Linux run `pcsc_scan` to confirm the reader is seen.
- **Write fails** → the card isn't NTAG21x, is read-only/locked, or wasn't held
  still. Use blank NTAG215 cards (the common Amazon ones).
- **macOS hangs** → the OS grabbed the reader; install the ACS macOS driver.

## No-code alternative

If the script is fiddly, the easiest desktop option is **NFC Tools for PC**
(wakdev) — it supports the ACR122U. Open it → **Write → Add a record → URL/URI**
→ paste the `…/c/<token>` URL → **Write** → place the card. Then mark the card
active in the portal as in step 5.
