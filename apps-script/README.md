# Name That Tune — Google Apps Script

Adds a **Name That Tune** menu to your Google Sheet with a one-click "Fetch Spotify IDs" action.

## Sheet layout expected

| A: Theme | B: Song Title | C: Artist | D: Spotify ID (auto-filled) | E: Clip Start Ms (manual) | F: Verify (auto-filled) |
|----------|--------------|-----------|----------------------------|--------------------------|------------------------|

Column F is for **visual verification only** — not used in the import. It shows the matched track in the format `Track Name — Artist (Album, Year)` so you can spot wrong versions (covers, re-releases, etc.) before importing.

Sheet tab must be named **Themes & Songs**.

---

## First-time setup

### 1. Install clasp (if not already)
```bash
npm install -g @google/clasp
```

### 2. Login with a project-local credentials file
This avoids overwriting global `~/.clasprc.json` if you use clasp for other projects under different accounts:
```bash
cd apps-script
clasp login --creds .clasprc.json
```
`.clasprc.json` is gitignored — credentials stay local only.

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
clasp push --auth .clasprc.json
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
```bash
cd apps-script
clasp push --auth .clasprc.json
```
