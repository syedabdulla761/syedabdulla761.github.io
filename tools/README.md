# tools/

Helper scripts used to build and verify the site. None of them run on the live site.

## Setup (once)

```bash
mkdir -p "$TMP/pp" && cd "$TMP/pp" && npm init -y && npm i puppeteer-core@23 gifenc pngjs omggif
cp /c/Users/syed.abdulla/repos/syed-portfolio/tools/*.js .
# serve the site for the tests
cd /c/Users/syed.abdulla/repos/syed-portfolio && python -m http.server 8765
```

All browser scripts drive the installed Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`.

| Script | What it does |
|---|---|
| `resume_v14.ps1` | Word COM: rebuilds `~/Downloads/Syed_Abdulla_Resume_v14.docx` from v13 and exports the site PDF. Run in PowerShell; edit the `Swap` lines to change wording. Then copy v14 to `Syed_Abdulla_Resume.docx`. |
| `capture-playground.js <outDir>` | Screenshots playground.simba.com screens as WebP (dismisses the tour pop-ups, waits for dashboards). |
| `capture-themes-gif.js <out.gif>` | Records the UI Themes page cycling Default → Composer → Dark → Modern as a GIF. |
| `test-interactions.js` | Sound, black hole, spin, hidden bug, card drag/tap, achievements panel; desktop + mobile; prints errors/overflow. |
| `test-arabic.js` | Toggles Arabic, screenshots sections, lists leftover English, toggles back. |
| `test-hero.js` | Hero at several phone sizes + desktop (checks the SA monogram doesn't cover the name). |
