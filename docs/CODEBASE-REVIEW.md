# Codebase review — September 30, 2026

Reviewed the active React application and API module, polling and shared
contracts, companion HTTP server, Deluge Python plugin and browser bridge,
theme/layout styles, packaging and verification scripts, documentation, and
CI configuration. Generated bundles were rebuilt from source; historical
backups were treated as archives, not active application code. Concurrent
Terminal-theme work in the shared workspace was preserved.

## Fixed

- Replaced the unbounded bencode parser with a separate, testable metadata
  module. Truncated lists/dictionaries now fail promptly; integers, byte
  lengths, nesting, dictionary keys, and payload sizes are validated. UTF-8
  path/name fields take precedence. Pure v2 metadata receives an explicit
  unsupported-preview message rather than a fabricated zero-byte payload.
- Corrected Deluge host status tuples and successful/failed add-host tuples.
  Host usernames are no longer displayed as connection status. Connection
  actions verify the daemon actually connected, and failed host removal
  stays visible instead of disappearing from the list.
- Corrected proxy configuration to use Deluge's numeric types, including
  authenticated proxies, SOCKS4, and I2P. Saving preserves existing
  credentials, hostname routing, peer/tracker routing, and force-proxy flags.
  Saving before the existing configuration loads fails safely.
- Reject malformed RPC replies while preserving legitimate null results.
  Add request timeouts in browser and companion modes. Temporary companion
  failures retain stale data; authentication errors retain the message needed
  to return to login. Hosted polling requests the same torrent option fields
  used by the companion.
- Prevent stale refresh responses from replacing newer state, prune selection
  of torrents removed elsewhere, clear library/overlay state after logout,
  and reset the detail drawer when its torrent changes.
- Protect Add, Remove, Move, Rename, and Connection Manager dialogs against
  Escape/outside dismissal during pending operations. Disable the Add close
  button during upload. Empty magnet/URL tabs no longer submit previously
  selected local torrent files.
- Preserve the parent path when renaming a nested folder. Avoid re-adding
  identical filenames to an existing Add review.
- Fall back to session-only preferences when browser storage is blocked or
  full; validate saved refresh intervals against supported choices.
- Restrict browser requests to the request's actual host/port and reject
  hostile hostnames on a loopback listener. Starting a login against another
  Deluge endpoint uses a fresh client, preventing forwarding an old session
  cookie to the new target. Failed login leaves the prior client intact.
- Return client errors for malformed JSON/RPC input, cap JSON requests at
  1 MiB, reject unknown API routes and unsupported methods, tighten static
  path containment, return 404 for missing assets, and serve image/font MIME
  types correctly.
- Repair hosted layout fixtures to load current versioned plugin resources.
  Correct the documented Node minimum and egg example; make the Windows
  launcher use the lockfile and stop if installation/build fails.
- Enable CI for pull requests and verify release resources after rebuilding
  the plugin. Rebuild the egg's SHA-256 sidecar automatically so it cannot
  silently disappear during packaging.

API contract fixes were checked against Deluge's upstream
[Web API](https://github.com/deluge-torrent/deluge/blob/develop/deluge/ui/web/json_api.py),
[host list](https://github.com/deluge-torrent/deluge/blob/develop/deluge/ui/hostlist.py),
and [proxy defaults](https://github.com/deluge-torrent/deluge/blob/develop/deluge/core/preferencesmanager.py).

## Validation

- 136 automated tests pass, including 26 new behavior tests covering parser,
  proxy, host discovery, storage, RPC responses, and an isolated live companion
  talking to a fake Deluge server. Oversized JSON requests return 413.
- Production build and server syntax checks pass.
- Standalone and hosted browser checks pass for selected/bulk/session controls,
  pending buttons, visible errors, proxy settings, malformed metadata,
  in-flight Add dismissal protection, payload priorities, and 390px mobile
  bounds. Browser fixtures reported no page errors.
- The packaged hosted bundle also passes torrent-control browser checks.
- Plugin build succeeds with Python 3.9; egg content and release metadata
  verification pass. `git diff --check` passes.
- Dependency audit reports no known vulnerabilities.

## Remaining limits and maintenance opportunities

Verification uses fictional data and fake Deluge endpoints. A real Windows
Deluge installation, session expiry on the production daemon, and native
third-party plugin dialogs still require target-host testing. The generated
egg is a local Python 3.9 build, not a certification of Windows compatibility.
No production torrent or daemon settings were changed.

The main JSX file remains large and includes an unused legacy table. A later
refactor could separate dialogs/table components and remove the legacy table
with browser coverage. Layered theme styles also deserve a dedicated
consolidation pass. Most pre-existing UI tests assert source text; the new
behavior/browser coverage strengthens the fixed paths but does not establish
an exhaustive every-theme/every-dialog visual matrix.

Pure BitTorrent v2 local-file preview is still unsupported; magnets and URLs
can be submitted to Deluge. Existing authenticated proxy credentials are
preserved, but editing those credentials remains a native Preferences task.
