# Deluge Deck

Deluge Deck is a modern, keyboard-friendly companion WebUI for Deluge 2.1+ and 2.2+. It runs as a small localhost service beside Deluge Web, keeps the Deluge session cookie server-side, and gives you a focused torrent workspace with drag-and-drop `.torrent` files, magnets, URL adds, live rates, filters, bulk actions, and a detail drawer.

It can also be packaged as a normal Deluge plugin (`.egg`) for the Plugins dialog shown in your screenshot. The plugin entry points include Core, GTK3, and WebUI; enabling the WebUI entry injects the same SPA into Deluge Web and switches the API calls to Deluge’s native `/json` and `/upload` endpoints. In this mode it uses the exact same host, port, password, cookies, and SSL settings as Deluge Web.

Deluge Deck supports two deliberate modes. The companion leaves your Deluge installation untouched and proxies `/json` and `/upload` on its loopback origin. The installed plugin mounts the same SPA inside Deluge Web on the existing origin and port, including reverse-proxy base paths; it uses Deluge’s existing authentication cookie and does not start a second service.

Current release: 1.0.3.

Version 0.9.17 keeps main-window `.torrent` drops in the review flow: a drop only preloads the normal Add to Deluge dialog, and nothing is uploaded or added until **Add to Deluge** is pressed. Removing one or many torrents opens a Deck dialog with separate **keep downloaded data** and **remove downloaded data** choices. Deck Preferences is an in-app panel for themes, refresh timing, keyboard help, and the centered native Deluge Preferences window. Deck owns the hosted viewport so the hidden stock ExtJS shell cannot push the login or dashboard below the fold. Desktop and mobile render the login immediately and transition to the correctly sized dashboard without a refresh. Torrent and file sizes match Deluge's binary units and one-decimal precision. Row actions close when details open, Escape closes Deck menus and dialogs even when a control has focus, and the top-bar theme control is now icon-only so theme names cannot overlap adjacent actions at compact widths.

## Windows quick start

1. Install Node.js 20+ on the Windows machine that runs Deluge Web.
2. Open PowerShell in this folder and run `npm install`, then `npm run build`.
3. Double-click `start-windows.cmd` (or run `npm start`).
4. Open [http://127.0.0.1:8118](http://127.0.0.1:8118) and enter your Deluge Web password.

Deluge Web normally listens on `http://127.0.0.1:8112`. Set `DELUGE_URL` in the environment if yours is different. The app binds to `127.0.0.1` by default so it is not exposed to your LAN. If you intentionally serve it remotely, put it behind TLS and an authenticated reverse proxy.

## Install through Deluge Preferences (plugin mode)

Build the plugin on the same Python major/minor version used by your Deluge installation:

```powershell
npm install
npm run build:plugin
```

Then open Deluge → Preferences → Plugins → Install Plugin and choose the generated file in `plugin\\dist\\` (for example `DelugeDeck-0.9.17-py3.9.egg`). Enable **DelugeDeck**, restart Deluge and `deluge-web`, then enable **DelugeDeck** in the WebUI plugin list if your build exposes a separate WebUI plugin page. Deluge plugin eggs are Python-version-specific, so build this artifact on the Windows machine running Deluge rather than copying a Mac-built egg.

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

- Live `web.update_ui` polling with stale/reconnecting state
- Downloading, seeding, paused, queued, completed, tracker, label, and search filters
- Multi-select with a sticky bulk action bar and an explicit remove-data safety choice
- Drag-and-drop multi-file `.torrent` intake, magnet links, and torrent URLs
- Add options for Windows download path, paused mode, and sequential downloads
- Torrent detail drawer with overview, files, peers, trackers, and options surfaces
- Eleven persistent, readable palettes (including light, seasonal, and holiday themes), responsive tablet/mobile layout, reduced-motion support, and keyboard shortcuts
- In-app Deck Preferences for themes, refresh interval, keyboard help, and optional native Deluge settings
- Secure loopback proxy with RPC allowlisting, upload size caps, origin validation, and no-store responses

## Verification

```sh
npm test
npm run check
```

For a real Deluge instance, test login, add, remove-with-data safety, file priorities, and the daemon’s capability/plugin set on the Windows host. Deluge paths are host paths (for example `D:\\Media\\Downloads`), not paths on the browser machine.

You can verify the real daemon connection without launching the UI. In PowerShell, set the password for the current process only and run:

```powershell
$env:DELUGE_PASSWORD = Read-Host 'Deluge Web password'
npm run verify:deluge
Remove-Item Env:DELUGE_PASSWORD
```

The probe performs `auth.login`, `auth.check_session`, `web.connected`, and a small `web.update_ui` request, then exits without saving the password.
