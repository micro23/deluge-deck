# Deluge Deck

Just download the .egg in the release and add it via the ui to plugins. Make sure WEBUI is enabled! Once you have webui enabled and add this plugin it will appear on first refresh of the webui. 

Please provide any feedback or requests to micro23@gmail.com



<img width="2273" height="1119" alt="Screenshot 2026-10-01 at 11 05 41 AM" src="https://github.com/user-attachments/assets/ac6cea12-184e-4061-82e9-7a0b96fe7023" />
<img width="1601" height="1059" alt="Screenshot 2026-10-01 at 11 14 44 AM" src="https://github.com/user-attachments/assets/7d41eca1-2603-4e6f-9967-abc8f4c708a3" />
<img width="2276" height="1126" alt="Screenshot 2026-10-01 at 11 15 12 AM" src="https://github.com/user-attachments/assets/43982bfe-01ec-4b7a-980c-a619a801e1ff" />


<img width="1748" height="1130" alt="Screenshot 2026-10-01 at 11 05 25 AM" src="https://github.com/user-attachments/assets/9dfbb700-8923-445f-bf84-b558d5886583" />

<img width="2280" height="1130" alt="Screenshot 2026-10-01 at 11 15 25 AM" src="https://github.com/user-attachments/assets/43f2825f-f46d-4467-88ae-ecfdf4d6081c" />
<img width="2274" height="1123" alt="Screenshot 2026-10-01 at 11 15 32 AM" src="https://github.com/user-attachments/assets/07654020-decf-48c1-b353-1318ca7764b4" />
<img width="2270" height="1116" alt="Screenshot 2026-10-01 at 11 15 39 AM" src="https://github.com/user-attachments/assets/b64f46f3-7706-4cf4-8ea2-e8bb0a7b63d1" />
<img width="2280" height="1124" alt="Screenshot 2026-10-01 at 11 15 46 AM" src="https://github.com/user-attachments/assets/152abe50-4dae-4c48-bcab-92499ab4fcdf" />
<img width="2278" height="1128" alt="Screenshot 2026-10-01 at 11 16 00 AM" src="https://github.com/user-attachments/assets/31a88146-22b6-4bca-8019-0484c962297a" />
<img width="2280" height="1124" alt="Screenshot 2026-10-01 at 11 15 53 AM" src="https://github.com/user-attachments/assets/d5ecd9f3-4dd3-48a3-acca-219cf1f0d43a" />
<img width="2289" height="1131" alt="Screenshot 2026-10-01 at 11 16 08 AM" src="https://github.com/user-attachments/assets/868922e5-4021-4a71-ade2-842f8af48767" />







Deluge Deck is a modern, keyboard-friendly companion WebUI for Deluge 2.1+ and 2.2+. It runs as a small localhost service beside Deluge Web, keeps the Deluge session cookie server-side, and gives you a focused torrent workspace with drag-and-drop `.torrent` files, magnets, URL adds, live rates, filters, bulk actions, and a detail drawer.

It can also be packaged as a normal Deluge plugin (`.egg`) for the Plugins dialog shown in your screenshot. USE THE PLUGIN! IT'S REALLY EASY. JUST ADD IT TO YOUR PLUGINS FOLDER OR GO INTO SETTINGS AND ADD THIS PLUGIN. The plugin entry points include Core, GTK3, and WebUI; enabling the WebUI entry injects the same SPA into Deluge Web and switches the API calls to Deluge’s native `/json` and `/upload` endpoints. In this mode it uses the exact same host, port, password, cookies, and SSL settings as Deluge Web.

Deluge Deck supports two deliberate modes. The companion leaves your Deluge installation untouched and proxies `/json` and `/upload` on its loopback origin. The installed plugin mounts the same SPA inside Deluge Web on the existing origin and port, including reverse-proxy base paths; it uses Deluge’s existing authentication cookie and does not start a second service.

Current release: 1.0.52.

The release version is read from `package.json` and propagated to the standalone UI, health endpoint, plugin metadata, and generated egg. See [CHANGELOG.md](CHANGELOG.md) and [docs/RELEASE.md](docs/RELEASE.md) for release history and the reproducible release procedure.

The current release keeps main-window `.torrent` drops in the review flow: a drop only preloads the normal Add to Deluge dialog, and nothing is uploaded or added until **Add to Deluge** is pressed. Removing one or many torrents opens a Deck dialog with separate **keep downloaded data** and **remove downloaded data** choices. Deck Preferences is an in-app panel for themes, refresh timing, keyboard help, and the centered native Deluge Preferences window. Desktop and mobile render the login immediately and transition to the correctly sized dashboard without a refresh. Terminal remains isolated in its own stylesheet, alongside isolated Valentine, Halloween, Christmas, New Year’s, and Independence Day themes with seasonal artwork and layouts.

## Windows quick start

1. Install Node.js 20.19+ or 22.12+ on the Windows machine that runs Deluge Web.
2. Open PowerShell in this folder and run `npm ci`, then `npm run build`.
3. Double-click `start-windows.cmd` (or run `npm start`).
4. Open [http://127.0.0.1:8118](http://127.0.0.1:8118) and enter your Deluge Web password.

Deluge Web normally listens on `http://127.0.0.1:8112`. Set `DELUGE_URL` in the environment if yours is different. The app binds to `127.0.0.1` by default so it is not exposed to your LAN. If you intentionally serve it remotely, put it behind TLS and an authenticated reverse proxy.

## Install through Deluge Preferences (plugin mode)

Build the plugin on the same Python major/minor version used by your Deluge installation:

```powershell
npm install
npm run build:plugin
```

Then open Deluge → Preferences → Plugins → Install Plugin and choose the generated file in `plugin\\dist\\` (for example `DelugeDeck-1.0.51-py3.9.egg`). Enable **DelugeDeck**, restart Deluge and `deluge-web`, then enable **DelugeDeck** in the WebUI plugin list if your build exposes a separate WebUI plugin page. Deluge plugin eggs are Python-version-specific, so build this artifact on the Windows machine running Deluge rather than copying a Mac-built egg.

### Using port 8888 (plugin mode)

The plugin does not open a second listener. Start Deluge Web on the port you want, then open that same URL. For Windows, the WebUI command is:

```powershell
deluge-web.exe -p 8888
```

Open `http://127.0.0.1:8888/`. If Deluge Web is already configured to use 8888, no Deluge Deck setting is needed—the plugin follows it automatically. The standalone companion (`npm start`) is separate and defaults to 8118; set `$env:PORT=8888` only when using that companion instead of the installed plugin.

If the plugin is listed but the checkbox immediately clears, the egg was loaded but one of its entry points failed during startup. Rebuild it with the Python that ships with your Windows Deluge install, reinstall the new egg, and restart both Deluge and `deluge-web`. For the exact cause, launch `deluge-debug.exe` from a Command Prompt and toggle the plugin; the traceback will identify an incompatible Python/Deluge version or a missing dependency. Deluge 1.x (Python 2) is not supported by this build; use Deluge 2.x (Python 3).

## Demo mode

`npm run demo` starts a realistic in-memory daemon with sample torrents, so you can explore the interface without a Deluge installation. It is also used by the contract tests (`npm test`).

## What’s included

- Bespoke theme details: Midnight radar, Paper letterpress, Ocean portholes, Forest botanical plates, Sunset copper light, St. Patrick's gilt enamel, engraved seasonal seals, and a monochrome Terminal scan texture. Phone layouts use compact static ornaments, and ambient motion respects reduced-motion preferences.
- Live `web.update_ui` polling with stale/reconnecting state
- Downloading, seeding, paused, queued, completed, tracker, label, and search filters
- Multi-select with a sticky bulk action bar and an explicit remove-data safety choice
- Drag-and-drop multi-file `.torrent` intake, magnet links, and torrent URLs
- Add options for Windows download path, paused mode, and sequential downloads
- Torrent detail drawer with overview, files, peers, trackers, and options surfaces
- Twelve persistent, readable palettes (including light, seasonal, holiday, and terminal themes), responsive tablet/mobile layout, reduced-motion support, and keyboard shortcuts
- In-app Deck Preferences for themes, refresh interval, keyboard help, and optional native Deluge settings
- Secure loopback proxy with RPC allowlisting, upload size caps, origin validation, and no-store responses

## Verification

```sh
npm test
npm run check
```

For theme layout checks, start `npm run demo` in another terminal, then run `npm run verify:themes`. This checks all twelve themes at five screen widths, paired card artwork, large speed values, and each column's pointer and keyboard resizing. It requires Chrome and uses only the fictional demo library. Set `DECK_PREVIEW_URL` for a different demo server address; screenshots and measurements are saved under `/tmp/deck-theme-review` by default (`SCREENSHOT_DIR` overrides this).

After building the plugin, start `node server/hosted-layout-fixture.mjs` in another terminal and run `npm run verify:package-styles`. This compares all twelve themes on desktop and phone with the optional CSS resource registered before and after the self-contained style script. Artwork is stored once in that script; older hosts can still register the lighter CSS resource.

After building, run `node scripts/verify-torrent-controls.mjs` to check selected and bulk pause/resume, pending controls, and visible errors in both UI modes. Set `CHROME_PATH` to an installed Chrome executable if Playwright’s browser is unavailable.

Run `node scripts/verify-reliability.mjs` for isolated browser checks of proxy settings, malformed torrent metadata, Add dialog protection during uploads, payload priorities, and mobile bounds. Both browser scripts use fictional fixtures and do not contact your Deluge daemon.

Dependencies are pinned in `package.json` and locked in `package-lock.json`; use `npm ci` for reproducible installs. Release builds also run the automated version, test, and plugin checks described in [docs/RELEASE.md](docs/RELEASE.md).

For a real Deluge instance, test login, add, remove-with-data safety, file priorities, and the daemon’s capability/plugin set on the Windows host. Deluge paths are host paths (for example `D:\\Media\\Downloads`), not paths on the browser machine.

You can verify the real daemon connection without launching the UI. In PowerShell, set the password for the current process only and run:

```powershell
$env:DELUGE_PASSWORD = Read-Host 'Deluge Web password'
npm run verify:deluge
Remove-Item Env:DELUGE_PASSWORD
```

The probe performs `auth.login`, `auth.check_session`, `web.connected`, and a small `web.update_ui` request, then exits without saving the password.
