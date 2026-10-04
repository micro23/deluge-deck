## 1.0.90

- Remove theme names from the Midnight, Paper, Ocean, Forest, and Sunset sidebar identities and mastheads.
- Recreate the five core theme masthead illustrations; refresh Midnight, Paper, Ocean, and Forest palettes while preserving Sunset’s palette and leaving Matrix unchanged.
- Rebuild the versioned WebUI resources and Python 3.14 source-only plugin egg.

## 1.0.89

- Refresh the in-app theme gallery screenshots for all regular and holiday themes, plus the Yankees, Knicks, Giants, and Rangers as one representative team for each sport.
- Replace the README’s outdated screenshot set with the current theme gallery previews, showing one team per sport.
- Rebuild the versioned WebUI resources and source-only Python 3.14 plugin egg.

## 1.0.88

- Rebuild Midnight, Paper, Ocean, Forest, and Sunset with distinct named identities, original vector symbols and engraving, and dedicated artwork mastheads.
- Replace translucent data surfaces with opaque palettes, refined typography, clearer dashboard cards, custom vector icons, and desktop search in the toolbar.
- Add theme-specific progress meters: segmented moonlight, ruled ink, flowing water, growing leaves, and layered twilight.
- Give Forest a deep-green navigation rail and Paper a warm letterpress finish; refine panel geometry and controls across all five themes.
- Add restrained ambient motion with reduced-motion support and accessible progress values, without decorative slogans.
- Refresh all five theme previews, versioned WebUI resources, and the source-only Python 3.14 plugin egg.

## 1.0.87

- Remove the parentheses around M in the Terminal theme's bottom-left Menu label.
- Refresh the versioned WebUI resources and source-only Python 3.14 plugin egg.

## 1.0.86

- Replace Matrix transfer fills with crisp green code that reveals the actual completion width in desktop rows, mobile cards, and the detail drawer.
- Animate falling code for active downloads; keep paused, queued, completed, and reduced-motion progress static, with accessible numeric progress semantics.
- Add seamless code rain over the city artwork, circuit-style telemetry icons, refined panel lighting, and a sharper selected-row accent.
- Remove the remaining decorative Matrix footer label and refresh the theme preview, WebUI resources, and source-only plugin egg.

## 1.0.85

- Remove the Matrix masthead's decorative slogan, source connection phrases, system number, and transmission phrases.
- Remove the source slogan from the Matrix theme preview and refresh its gallery images.
- Refresh the versioned WebUI resources and source-only Python 3.14 plugin egg.

## 1.0.84

- Give all 24 sports themes factual heritage mastheads: establishment year, current venue opening year, and World Series, NBA, Super Bowl, or Stanley Cup title counts.
- Remove sports slogans and refresh the Yankees and Mets identities with the same factual treatment.
- Add crisp baseball, basketball, football, and hockey vector icons with distinct dashboard action marks and stronger contrast.
- Refine responsive heritage panels, preserve team-specific artwork and materials, and refresh all sports theme previews.
- Document official history sources and verify all 24 themes at five viewport sizes, including 7:1 heritage text contrast and visible icon sizing.
- Refresh the versioned WebUI resources and source-only Python 3.14 plugin egg.

## 1.0.83

- Fix the USA theme footer eagle asset path in packaged Deluge eggs so the artwork displays in the installed plugin.

## 1.0.82

- Remove the Yankees theme's unwanted sidebar and masthead slogans.
- Fix low contrast in the dashboard stat icons and add red baseball stitching details to their navy badges.
- Refresh the versioned WebUI resources and source-only Python 3.14 plugin egg.

## 1.0.81

- Give the Yankees theme a dedicated Bronx identity and stadium-history masthead, with stronger pinstripe, navy, and chalk details throughout the dashboard.
- Add Yankees heritage copy including the 1923 Stadium opening, 27 World Series championships, and “The House that Ruth Built.”
- Refresh the versioned WebUI resources and source-only Python 3.14 plugin egg.

## 1.0.80

- Update the USA sidebar flag to the current 50-star design.
- Restore the flag-shaped torrent progress bar, filling left to right with transfer progress.
- Bring back the detailed bald eagle artwork at the bottom center of the USA theme, with a compact mobile treatment.
- Refresh the versioned WebUI resources and source-only Python 3.14 plugin egg.

## 1.0.79

- Replace Independence with the USA heritage theme while preserving saved theme selections.
- Add original flag and American monument engraving in a compact masthead, with ivory paper, navy ink, and muted red controls.
- Remove fireworks, medallions, striped rows, and flag progress bars; improve compact telemetry and responsive layouts.
- Package the USA theme and artwork in refreshed versioned WebUI resources and the Python 3.14 source-only plugin egg.

## 1.0.78

- Rebuild The Matrix theme around original cinematic city and code-rain artwork, ivory typography, charcoal panels, and restrained emerald accents.
- Add a responsive Matrix masthead and brand identity, with connection-aware status and reduced-motion support.
- Redesign telemetry cards, improve torrent table legibility, and pin row actions while optional columns scroll.
- Add Matrix search guidance and update responsive layout checks for the new card design.
- Refresh versioned WebUI resources and the Python 3.14 source-only plugin egg.

## 1.0.77

- Add The Matrix as a complete selectable theme, with a cinematic phosphor-green dashboard, responsive branding, reduced-motion support, and original code-rain artwork.
- Tighten torrent table spacing and keep the Matrix theme palette in the automated theme checks.
- Refresh the versioned WebUI resources and Python 3.14 source-only plugin egg.

## 1.0.76

- Make Darkhand the default theme and first theme in the picker.
- Add D as a direct shortcut to return to Darkhand.
- Focus the login password field automatically on first page load.

## 1.0.75

- Kept the Darkhand details pane empty until a torrent is selected.
- Tightened torrent name column spacing in compact layouts.

# Changelog

## 1.0.74

- Set the same default torrent columns in every theme, in the requested order: Name, State, Size, Progress, Download, Upload, ETA, Ratio, Seeds, Peers, and Seeding time.
- Hide Queue, Added, and Tracker by default while retaining them in the column chooser.
- Apply a one-time default-column update without resetting saved column widths.
- Tighten the gap after torrent selection checkboxes across desktop and mobile tables.
- Shrink Darkhand's short-list table to its content while keeping long lists scrollable, removing the unused area beneath the last row.
- Rebuild versioned resources and the Python 3.14 source-only egg.

## 1.0.73

- Remove Darkhand's bottom dashboard padding and reduce the top frame spacing.
- Place the column menu in a compact, integrated toolbar above the torrent headers.
- Align the Darkhand right-side torrent details panel flush with the viewport, open or collapsed, across desktop and narrow screens.
- Refresh versioned plugin resources and the Python 3.14 source-only egg.

## 1.0.72

- Make T advance one theme and Shift+T go back one theme in the exact theme-switcher order, wrapping through all 37 themes.
- Allow theme shortcuts throughout the interface, including focused controls, menus, preferences, and torrent details, while preserving typing in text inputs and editable content.
- Update the keyboard shortcut guide and add browser checks for the complete theme cycle in standalone and hosted plugin fixtures.
- Rebuild the versioned plugin resources and source-only Python 3.14 egg.

## 1.0.71

- Preserve the active theme when Deluge executes the stylesheet bootstrap again, preventing Terminal from flashing into a broken generic layout.
- Remove sidebar slogans and masthead side captions from all 24 sports themes; retain team branding and the sport/city caption below each sidebar logo.
- Let Darkhand wheel scrolling continue from torrent lists and details into the dashboard, using one details scroll area.
- Automatically fit and reveal bottom torrent details when opened, collapse them with Escape, and restore automatic sizing when reopened; retain pointer and keyboard resizing.
- Move Darkhand's right panel closer to the viewport edge and refresh the affected theme previews.
- Reconcile the superseded 1.0.11 branch while retaining current layout ownership and package versioning.
- Rebuild the versioned WebUI resources and Python 3.14 source-only plugin egg.

## 1.0.70

- Include the bespoke sports identities, mastheads, motifs, and refreshed gallery artwork from the parallel theme work.
- Reduce repeated torrent processing, hidden-page polling, inactive decorations, and legacy code.

- Render a scrolling window of torrent rows in large desktop and mobile libraries, preserving full-library selection and keyboard navigation.
- Load the selected theme and its artwork on demand; cache resources and retain the prior theme while the next one loads.
- Serve theme resources through the existing Deluge Web origin, including reverse-proxy base paths, with shared rules stored once and their original cascade order retained.
- Keep versioned UI resources fresh after the loader change.

## 1.0.69

- Arrange Darkhand placement controls, search, and actions in a stable themed top bar; remove the page heading, breadcrumb, and duplicate Add torrent button.
- Fix stats/details placement, responsive detail resizing, and sidebar count alignment; reduce the sidebar width by 15% and enable collapse.
- Optimize theme backgrounds, decorations, and gallery thumbnails with quality 82 WebP at their original dimensions; preserve the original artwork files.
- Rebuild the versioned WebUI resources and release egg with the smaller artwork payload.

## 1.0.68

- Add Darkhand as the second Regular theme, independently recreated with local fonts and scoped charcoal/blue card styling.
- Add live read-only peer/trackers detail tabs without external GeoIP calls or displayed tracker passkeys.
- Add persistent aggregate speed history (up to 90 days), range presets/custom ranges, six session stats, and remembered stats/details placement, collapse and accessible resizing.
- Review the upstream root installer and exclude it from Deck; document privileged discovery/credential/configuration risks. History writes use private atomic temporary files and bounded read-only RPC responses.

- Add a bespoke New York Mets theme under Baseball, bringing Sports to 24 teams and the gallery to 37 themes.
- Create a Mets-only Queens skyline masthead, illuminated cap badge, orange-trimmed cobalt enamel cards, and skyline/Home Run Apple decorations instead of the shared baseball artwork.
- Add a separately generated Citi Field exterior illustration with the rotunda, plaza reflections, and Home Run Apple; retain a clean, opaque torrent list.
- Add desktop and phone branding, a real demo preview, masthead clipping checks, and focused theme verification; preserve all existing theme designs.
- Rebuild the versioned WebUI resources and release egg.

## 1.0.66

- Expand Sports to 23 team themes, with Baseball, Basketball, Football, and Hockey subgroups; retain all 15 established themes and their styling.
- Add Dodgers, Red Sox, Blue Jays, Cubs, Lakers, Warriors, Bulls, Cavaliers, Heat, Cowboys, Eagles, Patriots, Chiefs, Steelers, Rangers, Blackhawks, Penguins, Bruins, Maple Leafs, and Canadiens themes.
- Give every added team its own generated stadium or arena backdrop, official local logo, team palette, and live telemetry card treatment. Add hockey rink decorations and ice-finished Rangers, Bruins, Toronto, and Montréal cards.
- Add actual dashboard previews, responsive identity marks, contrast checks for all 35 palettes and 23 sports card treatments, and browser checks for grouped navigation, persistence, and packaged assets.
- Keep the new themes' compact phone card labels and values centered with clear spacing inside their borders.
- Document the social-audience snapshots used for team selection, the built-in artwork generation prompts, and official logo sources.
- Rebuild the versioned WebUI resources and source-only release egg.

## 1.0.65

- Organize the theme picker into Regular, Holiday, and Sports categories, preserving keyboard navigation and saved selections.
- Add New York Yankees, Giants, and Knicks themes with team marks, cinematic stadium backdrops, and baseball, football, and basketball card artwork.
- Give Yankees cards an ivory pinstripe finish, Giants cards blue and red framing, and Knicks cards cobalt and orange detailing. Keep the four shared telemetry cards and clean torrent surfaces.
- Add compact team branding on phones, actual demo previews, AAA palette/card contrast checks, and grouped-menu browser verification.
- Restore theme-button focus on Escape before the shared menu dismissal runs. Existing theme styling remains unchanged.
- Bundle the new artwork in the versioned plugin resources and release egg; record image-generation prompts and official logo sources.

## 1.0.64

- Remove the decorative symbols at the right end of the Christmas and New Year status bars, and refresh their theme previews.

## 1.0.63

- Center Terminal's desktop sidebar commands, Library heading, filter labels, and bottom controls, with balanced dot and count columns.
- Refresh the Terminal theme preview.

## 1.0.62

- Move Terminal's Live sync and IP status to the right side of the desktop footer.
- Remove the line beside Name and center Terminal's column headings while keeping the resize controls available.
- Refresh the Terminal theme preview.

## 1.0.61

- Make the New Year banner year-independent by displaying "HAPPY NEW YEAR" without a date, and refresh its theme preview.

## 1.0.60

- Reduce the Independence Day table seal and fireworks opacity by 25%, including the seal's mobile styling.

## 1.0.59

- Give Midnight, Paper, Ocean, Forest, Sunset, Christmas, Valentine's, and New Year opaque torrent table surfaces without background artwork or decorative overlays.
- Preserve the existing clean St. Patrick's table and the Terminal, Halloween, and Independence Day designs.

## 1.0.58

- Remove the conservatory artwork from the St. Patrick's torrent table body for a cleaner, distraction-free list.

## 1.0.57

- Remove the extra eagle from the Independence sidebar while keeping the bottom-center eagle.
- Reduce Independence fireworks opacity to 20% and increase the central seal opacity by 10 percentage points on desktop and mobile.

## 1.0.56

- Publish one source-only Python 3.14-built egg and its checksum instead of four equivalent builds.
- Verify that the exact same artifact loads all five plugin entry points and WebUI resources on Python 3.11–3.14 using Deluge 2.2 base classes.
- Reject native extensions and Python bytecode in the shared egg, and gate release uploads on all compatibility checks.
- Explain that Deluge 2 accepts eggs built with another Python version; the filename suffix identifies the build interpreter.

## 1.0.55

- Replace Independence Day vector eagle decorations and fireworks with generated cinematic wildlife and realistic pyrotechnic artwork.
- Add a sculpted bronze eagle medallion to the table backdrop and stat cards, and refine the ivory fabric card materials and framing.
- Apply generated woven fabric shading to the accurate 13-stripe, 50-star progress flag while preserving its real download-progress clipping.
- Make Independence flag progress meters taller on phones and retain shared sidebar geometry.
- Save the built-in image-generation prompts in `docs/art/independence-prompts.json`.

## 1.0.54

- Replace Python 3.9 CI builds with separate eggs for Python 3.11, 3.12, 3.13, and 3.14.
- Automatically attach all eggs and SHA-256 checksums when a matching GitHub release is published.
- Pin GitHub actions and legacy egg packaging tools, keep build jobs read-only, and restrict release write access to the upload job.
- Reject mismatched release tags and check every packaged Python source file for syntax errors under the build interpreter.
- Document current Python build targets and local build instructions. Packaging checks do not establish live Deluge runtime compatibility.

## 1.0.53

- Add fuller red, white, and blue fireworks to the Independence Day dashboard background.
- Replace the top-left and bottom-center Independence Day eagle artwork with a more detailed matching illustration.

## 1.0.52

- Restore the Terminal dashboard's full Download, Upload, Connections, and Library card labels and keep their legends clear of the card borders.
- Remove the duplicate workspace Add torrent command while retaining the sidebar Add torrent control.
- Render a legible ASCII CLI mark in the Terminal sidebar with stable spacing at desktop sizes.

## 1.0.51

- Restore Independence Day navigation expansion, labels, sizing, and spacing using the shared sidebar layout.
- Reveal an American flag with thirteen stripes and fifty stars as actual torrent progress fills from 0 to 100 percent, including mobile meters.
- Add browser regression checks for sidebar toggling, persisted expansion, shared geometry, and flag fill levels.

## 1.0.50

- Remove the duplicate embedded artwork from the plugin's companion CSS resource, reducing the Python 3.9 egg from about 11.26 MB to 5.78 MB.
- Preserve the existing synchronous style loader, all artwork, and the optional stylesheet path for Deluge compatibility.
- Add visual package checks for all twelve themes on desktop and phone, including both stylesheet registration orders.

## 1.0.49

- Match the Independence Day theme to the reference flag, parchment, fireworks, and eagle treatment without adding a July 4th banner.
- Keep Independence styling isolated from every other theme, including responsive card and sidebar layouts.
- Raise the Terminal selected-torrent command bar above the bottom status rail so it no longer clips or collides.

## 1.0.48

- Keep every column resize handle visible with a contrasting marker and a wider pointer target in all twelve themes, including Terminal.
- Improve card label readability and contrast, reserve space for paired theme seals, and keep large speed values readable on small screens.
- Use real telemetry history for seasonal Connections graphs and Terminal sparklines instead of decorative traces.
- Unify shared artwork sizing and responsive card layout, refine Terminal tablet spacing, and refresh all twelve theme previews.
- Add browser verification at five screen widths for paired artwork, large speed values, and every column's pointer, keyboard, and reset controls.

## 1.0.47

- Finish the isolated Terminal CRT theme with a beveled monitor frame, dedicated narrow font, CLI logo, compact telemetry, and responsive mobile layout.
- Keep Terminal column widths, ordering, and layout storage separate from every other theme.
- Refresh the Terminal preview and packaged plugin assets.

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
