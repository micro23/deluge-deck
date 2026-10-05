# Darkhand source review and independent Deck implementation

Reviewed on October 2, 2026, against upstream commit
`7fb442b2cfcda61e767dec3b8b995fe417bed993`:
[Darkhand81/Deluge_Darkhand_Theme](https://github.com/Darkhand81/Deluge_Darkhand_Theme/tree/7fb442b2cfcda61e767dec3b8b995fe417bed993).

## Findings

Static review covered the installer, Python plugin and speed-history RPC, browser
script (including HTML insertion, RPC calls, component overrides and storage),
styles and font/icon assets, release workflow, and developer test/build tools.
The upstream installer and plugin were not executed. This assessment applies to
that source revision, not arbitrary release binaries or future updates.

No obvious malicious payload, credential exfiltration, hidden remote script
loader, miner, or persistence mechanism outside the documented Deluge integration
was found. Browser telemetry is obtained through Deluge's existing client; the
history backend reads aggregate session rates and writes its own JSON file. HTML
insertions use fixed markup, formatted numeric values or HTML-encoded text.
Fonts are local; the icon-generation development tool fetches Lucide assets.
Absence of an obvious payload is not a guarantee that the project has no bugs.

### Root access and installer risks

`darkhand.sh` requires root for install/uninstall, including installations whose
files could otherwise be writable by the service user. Its intended reasons are
writing Deluge's system package theme directories, changing service/user-owned
configuration, and stopping/starting systemd web services. The browser theme
itself does not need administrator privileges.

- **Broad target discovery:** it scans running processes, system package paths,
  `/home/*/.config/deluge`, root's config and common service directories. It can
  modify multiple discovered installations/configurations in one invocation.
- **Privileged interpreter execution:** it discovers Python interpreters from
  process arguments, launcher shebangs and PATH, then executes Python/imports as
  root. A compromised or user-controlled interpreter/package search path becomes
  privileged execution. This is a real trust boundary, even without malicious
  intent in the script.
- **Credential access:** it reads each target daemon's `auth` file and uses the
  `localclient` credential for RPC to `127.0.0.1` to enable/disable the plugin.
  No external credential destination was identified. This is nevertheless more
  privilege and credential access than a theme picker should require.
- **Configuration and service changes:** it edits `web.conf` and `core.conf`,
  changes enabled plugins and restarts matching systemd web services. These
  changes can affect a running installation and deserve explicit target scope.
- **Deletion and symlink exposure:** it deletes matching Darkhand eggs and replaces
  the theme's asset directory. Paths are generally quoted, but root-level
  operations in writable directories and the fixed history `.tmp` filename are
  not hardened against hostile symlinks/races.
- **Supply chain:** release Actions references are version tags rather than
  immutable SHAs; development setup installs some unpinned dependencies. No
  upstream implementation-code license was found in the reviewed checkout.

## What Deck includes

Deck implements the visual design and behavior in its existing React app and
DelugeDeck egg. It does not ship or run `darkhand.sh`, copy upstream Python or
ExtJS patches, read daemon credentials, modify Deluge package files, or launch a
root process. Normal installation uses Deluge's Plugins dialog with the existing
Deluge service user's permissions.

- Darkhand appears second in Regular themes, after Midnight.
- Independent scoped stylesheet uses the documented charcoal/blue palette,
  rounded cards, 16px gaps, compact rows, state-colored line icons and local fonts.
  Deck's controls and responsive implementation remain its own; this is a visual
  recreation rather than a pixel-identical ExtJS implementation. The reference
  palette's subdued text is AA on its card surface; it is intentionally not
  advertised as Deck's AAA palette variant.
- Six live stats include speed limits, active transfers, connections, DHT/incoming
  status, and a useful missing-download-folder warning with a Preferences link.
- Browser preferences remember stats above/below, details right/bottom,
  collapse state, independent table settings, panel size and chart range.
  Phones retain Deck's mobile transfers and details dialog. Read-only live Peers
  and Trackers tabs use the existing Deluge API; tracker URLs are reduced to hosts
  so passkeys are not displayed, and country codes come from the daemon.
- Chart presets and custom minute ranges extend to 90 days. The core component
  records every 2 seconds, retaining an hour of raw samples, two days of minute
  averages and 90 days of quarter-hour averages. Daemon downtime appears as gaps.
- The authenticated read-only `delugedeck.get_speed_history` RPC clamps spans and
  limits returned points to 1,200. It accepts no filesystem path or shell command.
- History contains only timestamps and download/upload rates. It is saved every
  five minutes and on disable in `deluge_deck_speed_history.json` in Deluge's
  config directory, using a private random temporary file and atomic replacement.
  Loads are size-limited and data is validated; symlinks are not deliberately
  followed. A crash may lose samples since the last save. History is collected
  whenever the core plugin is enabled, regardless of the selected theme.
- Without the updated core plugin, the chart clearly labels browser-session
  history; it does not claim to have historical data from before the page opened.
- Darkhand uses tracker favicons like the other themes. Inter and JetBrains
  Mono fonts retain their upstream OFL licenses in source and egg. Hosted styles
  embed fonts, so reverse-proxy paths work without external font requests.

## Feature comparison

Already available in Deck: torrent filters/search, keyboard actions, multi-select,
review-before-add, safe remove-data choices, queue controls, column resizing and
persistence, settings and daemon connection management, responsive mobile UI,
file priorities/renaming, and reduced-motion support. Those features were retained.
The additions above fill the principal dashboard/history gaps identified in
Darkhand; Deck retains its own detail tabs and native Preferences bridge rather
than replacing Deluge's full component system.

## Validation

All 138 Node tests and three Python speed-history tests passed. Darkhand's
browser checks passed at 1920, 1456, 1200, 820, 390 and 320px, including layout
placement, collapse, keyboard resizing, remembered settings, chart range,
read-only peer/tracker fixtures, and absence of third-party requests. Generic
column resize checks also passed for Darkhand, Midnight and Terminal at five
sizes. Hosted desktop/phone checks confirmed local font loading and identical
rendering with the optional CSS resource before/after the style loader. The
source-only Python 3.14 egg passed checksums, syntax and all five Deluge 2.2
entry-point lifecycle checks, including sampling and the history RPC.

These are fixture and package tests. A real Windows Deluge daemon and the
user's live torrent library were not used; installation and daemon restart
remain to be validated on that host. No GitHub release was published.
