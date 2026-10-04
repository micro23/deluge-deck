# Performance and size review — October 3, 2026

Reviewed the active React UI and application modules, polling and RPC contracts,
companion server, Python plugin and history storage, hosted bridge, theme assets
and styles, package/build scripts, verification scripts, dependency configuration,
and CI. Historical backups and generated bundles are not separate application
implementations. Existing Darkhand edits in the working tree were preserved.

## Improvements implemented

- **Render only the active progress decoration.** Every torrent previously built
  an Independence flag, Halloween potion, and Christmas cane, including their SVG
  children, in every theme. Desktop and mobile now build only the chosen theme's
  decoration. Artwork, percentages, accessibility, and theme styling are retained.
- **Avoid unnecessary table measurements.** Visible columns now have stable
  memoized identity. Selection, unrelated dashboard state, and an unchanged feed
  no longer trigger cloning and layout of the entire table. Mobile also explicitly
  bypasses desktop table measurements.
- **Reuse unchanged torrent snapshots.** Feed reconciliation checks every returned
  field, reuses unchanged rows, and returns the prior array without sorting if the
  library is unchanged. Changed rates/options, additions, removals, and queue
  positions invalidate the relevant snapshots. Nested values invalidate
  conservatively. Selection identity is also retained if no hashes disappear.
- **Make folder priority changes linear.** Folder membership is collected once
  into a Set rather than filtering the whole file list for every individual file.
  File-tree rows are memoized, and the search query is lowercased once per filter.
- **Pause auxiliary feeds in background tabs.** Darkhand history and peer/tracker
  details use the same visibility-aware, completion-scheduled poller as the main
  dashboard. Requests already in flight may finish; subsequent requests resume
  when the page becomes visible.
- **Reduce hosted bridge work.** The mutation observer ignores React's main root
  as well as its overlay root. One recurring connection-manager patch loop was
  redundant: the retained window-scanning loop already performs that patch.
- **Remove unused code.** Deleted the 507-line legacy table, its unused column
  catalog, and its obsolete document-wide favicon error listener. The active
  favicon component retains its own recovery and fallback behavior. Updated
  tests that were accidentally asserting the unused table's implementation.
- **Deduplicate packaged fonts.** The mandatory style script remains the source
  of embedded font faces and artwork. The optional CSS now reuses that source
  instead of containing a second copy of every font. The build script also reads
  the asset directory once and uses Set membership for asset lookup.
- **Repair native-layout verification.** The fixture now handles a missing
  AutoAdd namespace, allowing native Preferences tests without that plugin.
- **Separate build dependencies.** Vite, its React plugin, and concurrently are
  development dependencies. Their pinned versions are unchanged. Production
  installs can omit build tools; source builds still require `npm ci` with dev
  dependencies and retain the same build commands.

## Measured results

| Measure | Before | After |
| --- | ---: | ---: |
| Release egg | 9,684,972 bytes | 9,400,115 bytes |
| Optional hosted CSS | 867,707 bytes | 482,234 bytes |
| Main JavaScript | 528,676 bytes | 528,744 bytes |
| Elements inside a 300-torrent table | 38,436 | 9,936 |
| Holiday SVGs in the default theme | 900 | 0 |
| Table measurements after selection | 2 | 0 |
| Table measurements across two unchanged refreshes | 8 | 0 |

The egg is **2.94% smaller**; optional CSS is **44.4% smaller**. The default
300-torrent table has **74.1% fewer elements**. JavaScript grew by 68 bytes because
snapshot reconciliation and background polling replace work at runtime.

A paired local browser run reached the populated table in 472 ms before and
315 ms after. These are single-run observations, not statistically established
speed guarantees. Later runs under concurrent verification had different timing;
the element and measurement counts remained the same.

Reproduce the regression checks with `npm run build && npm run verify:performance`.
The script creates its own fictional 300-torrent server, checks redundant
measurements, and verifies all three progress decorations. For a paired comparison,
set `DECK_BASELINE_JS` to a previously saved standalone bundle. Optional
`DECK_PERFORMANCE_OUTPUT` saves the JSON measurements. No production daemon is used.

## Local checkout storage

Git object storage was about 2.9 GiB before compaction and is now about 1.7 GiB
(roughly 1.2 GiB saved). Used `git repack -a -d --cruft` with no expiration.
All 2,991 original Git objects and all 80 original ref entries are still present,
including unreachable objects; branches, tags, and history were not rewritten.
The app created an additional checkpoint during the review, which was retained.
Working-tree status changed only for the intended review edits. This saves local
disk space and does not affect the shipped egg.

## Remaining opportunities, in priority order

1. **Virtualize large libraries.** The table still renders every filtered torrent.
   Its DOM is much smaller now, but thousands of rows still cost CPU and memory.
   Windowed rows need careful preservation of selection, keyboard navigation,
   sorting, variable theme geometry, and column sizing. Profile a realistic large
   library before choosing thresholds or changing behavior.
2. **Load theme resources on demand.** The standalone stylesheet is about 525 KB;
   hosted mode embeds all theme artwork in one roughly 12.5 MB style script.
   Splitting themes and serving artwork as individual plugin resources could
   reduce startup transfer and parsing substantially while retaining the same
   image quality. This requires changing the hosted resource/bootstrap contract:
   the current packager expects one JS/CSS entry and self-contained artwork.
   Simply enabling generic Vite splitting would break that contract.
3. **Consolidate the layered CSS.** Shared, mobile, and theme override files have
   accumulated overlapping rules. Consolidation should preserve cascade order
   and use an every-theme visual matrix. Automated removal of apparently unused
   selectors would risk native ExtJS dialogs and dynamic theme classes.
4. **Isolate large metadata parsing.** Local torrent inspection parses metadata
   synchronously after reading each file. A worker or bounded inspection queue
   would improve responsiveness for unusually large files or bulk drops. Preserve
   parser bounds and exact file-index mapping when changing this path.
5. **Improve companion static delivery.** Static files currently use `readFile`
   per request and JS/CSS have no negotiated transport compression in this
   server. Streaming and gzip/Brotli or a reverse proxy could reduce memory and
   transfer costs. This would benefit companion hosting; the installed plugin
   uses Deluge's resource delivery.

Original artwork and backups remain available for regeneration. Vite includes
referenced assets, so originals do not automatically duplicate the release egg.
Deleting them would save source-checkout space at the expense of editable
masters. Further lossy compression was deliberately avoided.

## Validation

- 141 Node tests pass, including new behavioral tests for snapshot reconciliation.
- Production build, companion/fixture syntax checks, and release metadata pass.
- Python history tests pass; the rebuilt egg's five entry points and hosted
  resources load in the local Python 3.14.7 environment.
- Companion and hosted browser checks pass for torrent/session controls, errors,
  proxy settings, malformed metadata, pending Add dismissal, payload priorities,
  and mobile bounds.
- All 37 themes pass layout checks at five sizes, including pointer and keyboard
  column resizing. Darkhand chart, persistence, and controls pass at six widths.
- 44 real Deluge Preferences layouts pass, together with dropdown selection,
  plugin dialog handling, and close/reopen behavior.
- All 37 themes pass hosted style equivalence at desktop and phone sizes, with
  optional CSS inserted before and after the mandatory style script. Font loading
  and artwork remain intact.
- The performance regression fixture passes with 300 torrents, unchanged refreshes,
  selection changes, and all three seasonal progress decorations.

The changes were tested with fictional libraries and isolated endpoints.
Production daemon throughput and Windows-specific behavior were not benchmarked.
