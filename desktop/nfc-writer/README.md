# Walkers & Talkers — NFC Writer (Mac desktop app)

A small Electron app that writes Walkers & Talkers NFC cards using an **ACR122U**
USB reader. The web portal launches it via a `nfcwriter://` link; the app writes
the card's secure URL and tells the API to mark the card **active**.

```
Portal (browser)  ──nfcwriter://write?token=…──►  this app  ──USB──►  ACR122U ──►  NFC card
        ▲                                              │
        └───────────── API: activate_card_by_token ◄───┘
```

The card only ever stores a URL: `https://<your-domain>/c/<cardToken>` — never
member data.

---

## What the client experiences (non-technical)

1. Install this app once (double-click the `.dmg`, drag to Applications).
2. In the portal: open a member's card → **Program → Desktop App → "Write NFC
   Card"**.
3. This app pops up → place a blank **NTAG215** card on the ACR122U → it writes
   and the portal shows the card as **Active**.

No terminal, no npm — for the client. The steps below are for **you / your
developer** to build the installer.

---

## Build the installer (developer, on a Mac)

```bash
cd desktop/nfc-writer
npm install
npm run dist
```
This produces `dist/Walkers & Talkers NFC Writer-1.0.0.dmg`.

To run it locally without packaging while developing:
```bash
npm start
```

### Apple signing + notarisation (required for distribution)

macOS Gatekeeper will block an unsigned downloaded app. For a smooth client
install you must **sign with a Developer ID** and **notarise**:

1. Join the Apple Developer Program and create a **Developer ID Application**
   certificate (install it in your login keychain).
2. Create an app-specific password for notarisation and set env vars:
   ```bash
   export APPLE_ID="you@apple.id"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="YOURTEAMID"
   export CSC_NAME="Developer ID Application: Your Name (TEAMID)"
   ```
3. Build — electron-builder signs with the hardened runtime (entitlements in
   `build/entitlements.mac.plist`, which includes USB access) and notarises:
   ```bash
   npm run dist
   ```
   (electron-builder notarises automatically when the Apple env vars above are
   present.)

Without signing/notarisation the app still works if the user right-clicks →
**Open** the first time, but that's not a smooth client experience — sign it.

### Automatic builds (GitHub Actions — recommended, no Mac needed by you)

`.github/workflows/build-mac-app.yml` builds the `.dmg` on a macOS runner.

- **Get a build any time:** GitHub → **Actions → "Build Mac NFC Writer" → Run
  workflow**. When it finishes, download the **`nfc-writer-dmg`** artifact.
- **Publish a versioned installer:** push a tag, e.g.
  `git tag nfc-v1.0.0 && git push origin nfc-v1.0.0` → the `.dmg` is attached to
  a GitHub **Release**.

For a **signed + notarised** installer (no Gatekeeper warning), add these repo
secrets (Settings → Secrets and variables → Actions); without them you still get
an unsigned `.dmg` that opens via right-click → **Open**:

| Secret | What it is |
|---|---|
| `MAC_CSC_LINK` | base64 of your **Developer ID Application** `.p12` (`base64 -i cert.p12 \| pbcopy`) |
| `MAC_CSC_KEY_PASSWORD` | password for that `.p12` |
| `APPLE_ID` | your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | app-specific password for notarisation |
| `APPLE_TEAM_ID` | your Apple Developer Team ID |

### Auto-update (later)

Add `electron-updater` + a release feed (e.g. GitHub Releases or S3). macOS
auto-update **also** requires the app to be signed/notarised.

---

## How it talks to the backend

The portal builds the deep link with the public values:
```
nfcwriter://write?token=<cardToken>&url=<cardUrl>&api=<SUPABASE_URL>&key=<ANON_KEY>
```
After writing, the app calls the Supabase RPC `activate_card_by_token` (added in
`supabase/migrations/...card_desktop_api.sql`) with the anon key — no secret is
stored in the app. Run that migration (or `setup/full_setup.sql`) once.

API used:
- `activate_card_by_token(p_token)` — marks the card active after a successful write.
- `log_card_read(p_token)` — optional read/scan log.

(Card create / get / deactivate are handled in the portal via Supabase directly:
Issue card, Revoke card.)

---

## Troubleshooting

- **Reader shows disconnected** → plug in the ACR122U; on macOS install the ACS
  driver if the OS grabs the device.
- **Write rejected** → use **NTAG213/215/216** cards (not Mifare Classic).
- **Portal says "install the app"** → the `nfcwriter://` link had no handler;
  install the `.dmg` first, then retry.
