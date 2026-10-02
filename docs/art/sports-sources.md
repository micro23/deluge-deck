# Sports theme artwork

The stadium backdrops were generated with Codex's built-in image-generation
tool, then proportionally resized to 1600 pixels wide and encoded as WebP.
They are cinematic illustrations inspired by each sport, not documentary
photographs of the venues. Exact generation prompts and saved project assets
are recorded in [sports-prompts.json](sports-prompts.json).

Team marks are bundled locally, so selecting a theme makes no team-site requests:

- Yankees: [MLB's team logo asset](https://www.mlbstatic.com/team-logos/147.svg),
  saved as `src/assets/sports/yankees-logo.svg`. CSS renders the navy mark in
  white for the dark sidebar and mobile header.
- Giants: [NFL's club logo asset](https://static.www.nfl.com/t_headshot_desktop/league/api/clubs/logos/NYG),
  saved as `src/assets/sports/giants-logo.svg` (the source returns SVG).
- Knicks: [NBA's primary team logo asset](https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg),
  saved as `src/assets/sports/knicks-logo.svg`.

The team names and marks belong to their respective owners. These are fan
themes; no endorsement or affiliation is implied. Generation applies only to
the venue backdrops. Baseball seams, football lacing, basketball lines, and
card materials are SVG/CSS decorations. Sparklines and displayed values remain
actual session telemetry.

The three theme-picker previews are captures of the fictional demo library.
Refresh only these previews with:

```sh
DECK_PREVIEW_THEMES=yankees,giants,knicks node scripts/generate-theme-previews.mjs
```
