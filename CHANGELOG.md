# Changelog

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
