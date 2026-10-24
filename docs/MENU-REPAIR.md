# Menu and action repair — 1.0.96

Shared settings now use consistent label, input, and action spacing on desktop
and phones. Floating torrent dialogs and menus use the viewport overlay so
header controls cannot cover their buttons. Classic Deluge keeps its original
widgets, options manager, and Apply/OK handlers. Torrent table styles no longer
alter ExtJS measurements, and switching settings pages after resizing forces
nested controls to recalculate their widths.

The action audit corrected these daemon mappings:

- Torrent status `is_auto_managed` writes option `auto_managed`.
- Status `prioritize_first_last` writes `prioritize_first_last_pieces`.
- Full/sparse storage allocation writes `pre_allocate_storage`.
- Disk cache displays the original 16 KiB blocks and accepts the native -1 value.
- Settings load before fields can be edited, and success requires daemon readback.
- Removal reports per-torrent failures returned inside a successful RPC response.
- Hosted bridge initialization tolerates repeated Deluge resource execution.

## Verification

Tested October 24, 2026 with Chrome and a disposable Docker Deluge 2.2 server.
The installed plugin was the generated Python 3.14 source-only egg, loaded by
the container's Python 3.12 Deluge runtime. No production daemon was modified.

- 150 Node tests pass; production build, release metadata, syntax, and diff checks pass.
- `scripts/verify-settings-layout.mjs`: 152 combinations (38 themes at 1280,
  768, 390, and 320 pixels), including reachable save buttons and global controls.
- `scripts/verify-native-layout.mjs`: 44 native page/viewport combinations,
  folder-input widths, fieldset bounds, dropdowns, plugin install dialog,
  Close, and reopen.
- `scripts/verify-live-menu-actions.mjs`: real server readback of paths,
  network, proxy, cache, limits, torrent options; actual add, resume, pause,
  reannounce, recheck, move, rename, and removal through the UI. Passed in
  companion mode and installed hosted mode; hosted run also checks file priority
  and first/last-piece priority.
- `scripts/verify-live-native-settings.mjs`: original native Apply writes paths
  and cache settings to the daemon; OK, Close, and reopening saved values work.
- Existing reliability and torrent-control browser checks pass in companion
  and hosted modes, including the packaged assets, selected/bulk/session actions,
  pending-action controls, visible failures, proxy preservation, and upload handling.

The live scripts require explicit write opt-in, loopback URLs, a test password,
and an empty disposable daemon. They restore modified configuration and remove
owned test torrents. They are not intended to run on a production library.
Third-party plugin-specific settings and other Deluge versions remain outside
this verification matrix.
