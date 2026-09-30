# Changelog

## 1.0.46

- Reject malformed or truncated torrent metadata promptly instead of freezing the browser; validate payload sizes and UTF-8 paths and report unsupported pure-v2 previews clearly.
- Correct Deluge host status and add-host response handling, verify daemon connections, and retain visible host-removal errors.
- Save numeric Deluge proxy types while preserving existing credentials and routing flags, including authenticated proxies, SOCKS4, and I2P.
- Reject invalid RPC responses, bound network waits, preserve useful authentication errors, and align hosted torrent option fields with companion mode.
- Prevent stale refreshes from replacing newer data, clear library and overlay state on logout, and remove obsolete selections.
- Keep operation dialogs open while actions are pending; prevent empty magnet/URL tabs from submitting local files and preserve parent paths during nested-folder rename.
- Keep preferences usable when browser storage is unavailable and validate saved refresh timing.
- Tighten loopback origin and hostname validation, isolate cookies when changing Deluge endpoints, validate RPC inputs, and correct static asset responses.
- Refine Terminal with a dedicated narrow CRT font, compact console layout, theme-specific table settings, search controls, and responsive styling.
- Fix hosted fixture resource filenames, improve Windows startup failures, enable pull-request CI, and generate release checksums automatically.
- Add 26 behavior tests and isolated standalone/hosted browser reliability checks. The suite now contains 136 passing tests.

## 1.0.45

- Make the top Pause and Resume controls act on checked torrents, with selection counts in their labels. Disable selected-torrent controls while a request runs, preserve selection on failure, and show session errors and confirmations outside the closed session panel.
- Suppress right-click menus throughout the main dashboard.
- Add browser regression checks for selected and bulk pause/resume, pending requests, visible errors, and session actions in companion and hosted-plugin modes.
- Refresh all twelve theme previews to match the shared dashboard sizing.
- Use Midnight's shared expanded and collapsed sidebar sizing, centered icons, and control spacing in all twelve themes.
- Use Christmas's shared dashboard scale across all twelve themes: compact metric cards, consistent text and controls, and 40px desktop table rows. Preserve measured and manually resized columns across palettes.

## 1.0.44

- Remove the square shadow around the Valentine Seeding heart.

- Pin the table column menu to the table viewport during both horizontal and vertical scrolling in every theme.
- Replace the Halloween status-rail ornament with pumpkins and candles in reserved space above the status text.
- Replace Christmas progress bars with red-and-white striped candy canes; fill follows actual progress along the stem and curved hook.
- Change Halloween potion bottle glass, outlines, and reflections to neutral grey while retaining the orange liquid.
- Replace theme picker mockups with current dashboard screenshots for all twelve themes, using only the fictional demo library and larger previews.
- Remove all six core-theme table watermarks and seasonal floating corner symbols; keep remaining table decoration beneath torrent data.
- Add bespoke decorative seals to all twelve themes, with radar sweeps, drifting ocean details, botanical glimmers, and a monochrome Terminal cursor.
- Give Midnight, Paper, Ocean, Forest, Sunset, and St. Patrick's distinct card materials, icon frames, and progress meters.
- Refine seasonal navigation and Christmas, Independence Day, and New Year progress treatments.
- Keep decorations out of the input layer, compact them on phones, and respect reduced-motion preferences.
- Keep the theme picker above sticky table headers and reveal scrolled options below its heading.
- Update stale favicon and hosted login-mask source assertions to match the existing implementation.

## 1.0.43

- Replace the Halloween Seeding circle with an orange pumpkin badge and readable checkmark.

## 1.0.42

- Remove the small bordered graph boxes from the Halloween Download, Upload, and Library cards.
- Give all four Halloween card graphs the same transparent, full-width treatment as Connections.

## 1.0.41

- Change Halloween Seeding labels and checkmark badges to orange.
- Change the Halloween potion liquid, highlights, glow, and completed bulb to orange on desktop and mobile.

## 1.0.40

- Remove the decorative sidebar key and lower-right table star from the Halloween theme.

## 1.0.39

- Fill the Halloween potion vial's round end at 100% progress on desktop and mobile.

## 1.0.38

- Hide Deluge's legacy `mainPanel` behind the hosted dashboard so mobile overscroll cannot expose the old interface.
- Center the phone search bar and fit all five library filters on one row without horizontal scrolling.
- Restore the Halloween potion fill height on phones and fill the vial bulb when a torrent reaches 100%.

## 1.0.37

- Fixed the hosted mobile login blocker by suppressing Deluge's remaining legacy login mask and shadow, so the password field receives touch input.
- Reworked phone summary cards, torrent rows, details, preferences, and seasonal theme controls for narrow screens.
- Reduced repeated torrent refresh failures with retry backoff on unstable mobile connections.
- Reduced hosted plugin stylesheet size by embedding each theme artwork asset once.

## 1.0.36

- Refined all twelve themes with dedicated summary card details, richer table surfaces, and theme gallery previews.
- Reworked Terminal's desktop header and dense table layout while preserving its isolated styling.
- Improved Halloween and Valentine's Day cards and mobile layouts; kept seasonal ornaments behind readable torrent rows.
- Added responsive tablet layouts and corrected St. Patrick's mobile summary contrast.
- Replaced failed tracker favicons with a neutral fallback icon.
- Embedded seasonal SVG artwork in the hosted plugin stylesheet.

## 1.0.35

- Added theme-specific ornamental card corners, stronger firework art, and clearer New Year rooftop imagery.
- Refined Christmas card icons and revealed more of its winter forest scene through the torrent panel.
- Centered seasonal stat cards at phone widths and prevented the New Year ribbon from overlapping them.


## 1.0.34

- Added standalone Christmas, New Year’s, and Independence Day themes with isolated artwork, layouts, seasonal card treatments, and responsive styling.
- Centered and evenly spaced the Connections graph for all three themes.


## 1.0.33

- Refined the Halloween summary cards and centered its Connections graph.
- Kept Halloween web corner art proportional across window sizes.
- Refined the Valentine Connections graph and responsive table filigree.
- Replaced the Valentine Seeding marker with a glossy heart icon.

## 1.0.32

- Added standalone Valentine and Halloween themes with theme-scoped artwork and layout treatments.
- Recreated the Valentine dashboard with bespoke heart, book, filigree, and brocade artwork.
- Added the Halloween graveyard dashboard, glass potion-vial progress meters, and an orange, copper, and black palette.
- Expanded the isolated Terminal layout to follow its command-line reference more closely.
- Fixed the completion-celebration preference so changes apply immediately and isolated seasonal table-column preferences by theme.

## 1.0.31

- Avoid opening the password manager automatically on first load so the Deluge Web password field is ready for deliberate input.

## 1.0.30

- Added public-release privacy guidance and stronger ignore rules for local credentials, browser captures, torrent metadata, and Deluge runtime state.
- Audited tracked source, packaged plugin assets, Git branches and tags, and dangling Git objects for private hostnames and credential patterns before publication.

## 1.0.29

- Replaced oversized mobile cards with a compact torrent list, with names, progress, rates, size, ratio, sorting, and selection always available.
- Rebuilt mobile details and action menus to fit portrait and landscape screens without hiding controls behind the header.
- Simplified mobile navigation and summary statistics while preserving the desktop table and layout.
- Moved Terminal into an isolated theme stylesheet and rebuilt it as a monochrome CLI console with bracketed controls, thin borders, ASCII-style progress bars, and matching dialogs.
- Verified non-Terminal themes keep their existing computed styles while Terminal receives the new visual treatment.
- Included the mobile rebuild in the versioned Deluge plugin assets and egg.

## 1.0.28

- Rebuilt the Terminal theme as a high-contrast operator console with hard-edged monochrome panels, scanlines, square controls, and terminal-style navigation.
- Removed the remaining soft dashboard styling from Terminal stat cards, tables, dialogs, and status rails.
- Included the updated Terminal theme in the generated Deluge plugin egg.

## 1.0.27

- Prevented Deluge's stock Connection Manager from appearing during first-launch daemon connection.

## 1.0.26

- Added the high-contrast Terminal monochrome black-and-white theme.

## 1.0.25

- Removed all stat-card gradient backgrounds and decorative wash overlays.

## 1.0.24

- Removed the distracting left-edge gradient overlay from dashboard stat cards.

## 1.0.23

- Centralized release versioning across the UI, server, plugin, and generated egg.
- Split API/session transport and theme configuration into dedicated frontend modules.
- Added release verification, pinned dependencies, expanded CI checks, and release documentation.

## 1.0.22

- Added hosted-daemon auto-connect after native Deluge Web authentication.
- Suppressed the legacy Deluge connection manager in favor of Deck controls.
- Refined table controls, responsive layouts, themes, dialogs, and plugin packaging.
- Added the current polling, accessibility, hosted-bridge, and plugin contract coverage.

Earlier release details are preserved in the git history and tagged releases.
