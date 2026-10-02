# Expanded sports theme selection

Roster selected on October 2, 2026. Popularity is represented by published
social-audience snapshots rather than game standings or franchise value.
Follower totals are a useful selection proxy, not counts of unique fans.
Existing Yankees, Giants, and Knicks themes are retained.

| Sport | Ranked selection added or retained | Source snapshot |
| --- | --- | --- |
| Baseball | Dodgers, Yankees, Red Sox, Blue Jays, Cubs | [Published Instagram ranking](https://www.jetpunk.com/user-quizzes/1275717/mlb-teams-by-instagram-followers), December 27, 2025 |
| Basketball | Lakers, Warriors, Bulls, Cavaliers, Heat; retain Knicks | [Zoomph social audience ranking](https://zoomph.com/blog/the-most-followed-pro-sports-teams-in-north-america-2026/), May 2026, published July 9, 2026 |
| Football | Cowboys, Eagles, Patriots, Chiefs, Steelers; retain Giants | [Zoomph social audience ranking](https://zoomph.com/blog/the-most-followed-pro-sports-teams-in-north-america-2026/), May 2026 |
| Hockey | Rangers, plus Blackhawks, Penguins, Bruins, Maple Leafs, Canadiens | [Tout sur le hockey's collected audience table](https://www.toutsurlehockey.com/actualite/quelles-sont-les-equipes-de-la-lnh-les-plus-suivies-sur-les-medias-sociaux/), March 24, 2026 |

Zoomph combines Facebook, Instagram, X, TikTok, and YouTube followers. Its
published data puts the named NBA and NFL clubs first through fifth within
their leagues. Hockey uses the five highest-ranked clubs other than the
explicitly requested Rangers, yielding six hockey themes.

There are 23 sports themes and 35 themes total. Sports subgroups have 5
baseball, 6 basketball, 6 football, and 6 hockey teams. Sources are selection
references; the menu presents teams by sport without displaying live rankings.

## Added artwork

Each of the 20 added teams has a separately generated venue backdrop, created
with the built-in image-generation tool. These are cinematic venue-inspired
illustrations, not documentary photographs. Exact prompts and output paths
are in [sports-expansion-prompts.json](sports-expansion-prompts.json). The
established three teams’ artwork remains unchanged.

SVG marks are fetched from the leagues' official CDNs and bundled inline in
the JavaScript resource. NHL SVG view boxes are tightened around their
existing paths, with an 8-unit margin, so the marks have comparable visible
sizes. Team names and marks belong to their owners. These are fan themes and
imply no endorsement or affiliation.

| Added team | Official logo source |
| --- | --- |
| Los Angeles Dodgers | [League asset](https://www.mlbstatic.com/team-logos/119.svg) |
| Boston Red Sox | [League asset](https://www.mlbstatic.com/team-logos/111.svg) |
| Toronto Blue Jays | [League asset](https://www.mlbstatic.com/team-logos/141.svg) |
| Chicago Cubs | [League asset](https://www.mlbstatic.com/team-logos/112.svg) |
| Los Angeles Lakers | [League asset](https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg) |
| Golden State Warriors | [League asset](https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg) |
| Chicago Bulls | [League asset](https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg) |
| Cleveland Cavaliers | [League asset](https://cdn.nba.com/logos/nba/1610612739/primary/L/logo.svg) |
| Miami Heat | [League asset](https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg) |
| Dallas Cowboys | [League asset](https://static.www.nfl.com/t_headshot_desktop/league/api/clubs/logos/DAL) |
| Philadelphia Eagles | [League asset](https://static.www.nfl.com/t_headshot_desktop/league/api/clubs/logos/PHI) |
| New England Patriots | [League asset](https://static.www.nfl.com/t_headshot_desktop/league/api/clubs/logos/NE) |
| Kansas City Chiefs | [League asset](https://static.www.nfl.com/t_headshot_desktop/league/api/clubs/logos/KC) |
| Pittsburgh Steelers | [League asset](https://static.www.nfl.com/t_headshot_desktop/league/api/clubs/logos/PIT) |
| New York Rangers | [League asset](https://assets.nhle.com/logos/nhl/svg/NYR_dark.svg) |
| Chicago Blackhawks | [League asset](https://assets.nhle.com/logos/nhl/svg/CHI_dark.svg) |
| Pittsburgh Penguins | [League asset](https://assets.nhle.com/logos/nhl/svg/PIT_dark.svg) |
| Boston Bruins | [League asset](https://assets.nhle.com/logos/nhl/svg/BOS_dark.svg) |
| Toronto Maple Leafs | [League asset](https://assets.nhle.com/logos/nhl/svg/TOR_dark.svg) |
| Montreal Canadiens | [League asset](https://assets.nhle.com/logos/nhl/svg/MTL_dark.svg) |

Logo files are `src/assets/sports/<team-id>-logo.svg`; venue artwork is
`src/assets/sports/<team-id>-stadium.webp`. No venue or logo request leaves
the local server when selecting a theme. Baseball seams, football laces,
basketball seams, and hockey rink markings are code-native SVG decorations.
The telemetry cards retain real session values and sparklines.
