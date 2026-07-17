# Name That Tune — Google Apps Script

Adds a **Name That Tune** menu to your Google Sheet with a one-click "Fetch Spotify IDs" action.

## Sheet layout expected

| A: Theme | B: Song Title | C: Artist | D: Spotify ID (auto-filled) | E: Clip Start Ms (manual) | F: Verify (auto-filled) | G: Chorus Start Ms (manual) |
|----------|--------------|-----------|----------------------------|--------------------------|------------------------|------------------------------|

Column F is for **visual verification only** — not used in the import. It shows the matched track in the format `Track Name — Artist (Album, Year)` so you can spot wrong versions (covers, re-releases, etc.) before importing.

Column G (`chorus_ms`) is reserved for manual entry, same as column E — fill in the timestamp (ms) where the first chorus begins. Leave blank if unknown; it's optional and maps to `chorusStartMs` on import into `/gameadmin`.

Sheet tab must be named **Themes & Songs**.

---

## First-time setup

### 1. Install clasp (if not already)
```bash
npm install -g @google/clasp
```

### 2. Login
```bash
clasp login
```
This opens a browser tab to sign in with the Google account that owns/can edit
your Sheet, and writes credentials to the global `~/.clasprc.json`.

> Note: `clasp login --creds <file>` is for a *different* purpose — it expects
> `<file>` to be an OAuth client credentials JSON you've already downloaded
> from Google Cloud Console (a custom "Desktop app" OAuth client), not an
> empty file for clasp to create. Don't use `--creds` unless you have one of
> those.

If you use clasp for other projects under different Google accounts, back up
this account's credentials right after logging in so you can swap between
them later (see "Deploying updates" below):
```bash
cp ~/.clasprc.json ~/.clasprc-game-show.json
```

### 3. Create the Apps Script project bound to your sheet

Open your Google Sheet → **Extensions → Apps Script**.  
Copy the **Script ID** from the URL:  
`https://script.google.com/home/projects/YOUR_SCRIPT_ID_HERE/edit`

Paste it into `apps-script/.clasp.json`:
```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "."
}
```

### 4. Push the code
```bash
clasp push
```

### 5. Set your Spotify credentials (one time)

In your Google Sheet, reload the page. A **Name That Tune** menu appears.  
Go to **Name That Tune → Set Spotify Credentials** and enter your:
- Spotify app **Client ID**
- Spotify app **Client Secret**

These are stored securely in Apps Script's User Properties (not in cells).

> Your existing Spotify Developer app (the one used for VPS playback) works here —  
> Client Credentials flow is separate from user OAuth and doesn't need a redirect URI.

---

## Usage

1. Add new songs to the **Themes & Songs** tab (columns A–C)
2. **Name That Tune → Fetch Spotify IDs**
3. Column D fills with Spotify track IDs (rows already filled are skipped)
4. Rows where no match is found are marked `NOT_FOUND` — correct manually
5. Run your existing join formula → copy → paste into `/gameadmin` as usual

---

## Deploying updates

Swap to the game-show clasp account, push, then swap back:
```bash
cp ~/.clasprc-game-show.json ~/.clasprc.json
cd apps-script
clasp push
cp ~/.clasprc-other-project.json ~/.clasprc.json
```

---

## Chorus Tagger sidebar

Remote-controls Spotify Connect (your desktop/mobile/web Spotify client) from a
Google Sheets sidebar so you can scrub to the chorus and save the timestamp
into the sheet, without leaving the browser tab. Files: `chorusTagger.js`,
`chorusTaggerSidebar.html`. Requires a **Spotify Premium** account and an
already-open Spotify client on some device.

### One-time setup

1. `clasp push` (this pulls in the `OAuth2` library declared in
   `appsscript.json`). If clasp complains the library version is invalid,
   open the project in the Apps Script editor once → Libraries → re-select
   the `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF` library →
   pick the latest version → Save, then `clasp pull` to sync the corrected
   version number back into this repo.
2. In the Apps Script editor, select the `logRedirectUri` function and click
   **Run**. Open **View → Logs** and copy the URL it prints
   (`https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`).
3. In the [Spotify developer dashboard](https://developer.spotify.com/dashboard),
   open your existing app (the same one used for "Fetch Spotify IDs") →
   Settings → add that URL under **Redirect URIs** → Save.
4. Reload the Sheet. **Name That Tune → Authorize Spotify (Chorus Tagger)** →
   click the link → approve access → close that tab.
5. **Name That Tune → Chorus Tagger** opens the sidebar.

### Sheet requirements

Uses the same **Themes & Songs** tab, resolving columns by header text
(`CHORUS_TAGGER_CONFIG` at the top of `chorusTagger.js`) rather than fixed
letters — adjust those header strings if your row-1 text differs. The
`Chorus Start Ms` header is created automatically in the first empty column
if missing.

### Usage

- Sidebar auto-loads the next row with a blank chorus column and starts
  playback at 0:20 (skips most intros).
- Use quick-jump / nudge buttons or arrow keys to scrub, **Mark Chorus**
  (or `M`) to save `progress - 750ms` into the sheet, **Test jump** to
  verify the saved value, **Next song** (or `N`) to advance.
- If no active Spotify device is found, a device picker appears — pick one
  and try again.
