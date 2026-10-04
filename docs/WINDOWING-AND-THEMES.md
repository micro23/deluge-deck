# Windowed lists and lazy themes — 1.0.70

Libraries above 200 torrents render a scrolling window with overscan. Filtering, sorting, selection, bulk actions, and keyboard navigation still use the complete library. Smaller libraries retain ordinary rendering.

In the 5,000-torrent browser fixture, both companion and hosted modes rendered 23 desktop rows and 12 phone rows. End/Home/arrow/page navigation, selection across distant rows, select-all, filtering, theme failures, cached switches, and reverse-proxy resource paths passed.

Production styles retain their original cascade order. Shared rules are stored once; the selected theme is fetched before activation, and gallery art is requested when opening the theme menu. Fonts and artwork are individually cacheable resources in the plugin egg. No theme or original artwork was removed. A failed switch retains the current theme.

Validation: 145 unit tests, production build, release metadata, installed plugin entrypoints, companion and packaged hosted controls, and reliability checks. Browser fixtures do not substitute for testing against your production daemon.

## Backup and rollback

The pre-feature backup contains 349 source/package files with SHA-256 verification, plus the baseline production build. It includes the sports updates present when this feature work began.

Backup: `/Users/micro/Documents/ChatGPT/Torrent-ui-backups/before-windowed-list-and-lazy-themes-20261003-193139`

To restore locally:

```sh
python3 '/Users/micro/Documents/ChatGPT/Torrent-ui-backups/before-windowed-list-and-lazy-themes-20261003-193139/restore.py'
```

The restore script first saves the current nonignored workspace files to another archive, restores the checkpoint, and removes the feature's added resources. It does not change Git history or publish a rollback. For an installed plugin, reinstall the previous 1.0.69 egg from the backup and restart Deluge Web.
