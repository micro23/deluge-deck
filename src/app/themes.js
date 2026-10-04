import { SPORTS_CLUBS, SPORTS_GROUPS } from './sports-clubs.js';

export const THEMES = [
  ['darkhand', 'Darkhand', 'Low-glare charcoal cards, Deluge blue, and live transfer history.', '💧'],
  ['terminal', 'Terminal', 'A high-contrast operator console in pure black, white, and hard-edged mono.', '📟'],
  ['matrix', 'The Matrix', 'Rain soaked code, phosphor green telemetry, and a dark digital city.', '🟢'],
  ['dark', 'Midnight', 'Celestial blue, etched instruments, and crisp midnight surfaces.', '🌙'],
  ['light', 'Paper', 'Warm paper, letterpress ink, and architectural engraving.', '📝'],
  ['ocean', 'Ocean', 'Deep-water glass, aqua currents, and sonar details.', '🌊'],
  ['forest', 'Forest', 'Botanical parchment, pine-green rails, and growing leaf meters.', '🌲'],
  ['sunset', 'Sunset', 'Copper twilight, violet glass, and layered horizon light.', '🌅'],
  ['christmas', 'Christmas', 'Evergreen, cranberry, snow, and gold.', '🎄'],
  ['halloween', 'Halloween', 'Strict black and harvest-orange contrast.', '🎃'],
  ['valentine', 'Valentine’s', 'Rose paper, berry ink, and plum detail.', '💗'],
  ['st-patricks', 'St. Patrick’s', 'Clover, heritage green, and cream.', '☘️'],
  ['independence', 'USA', 'Old American engraving, heritage flags, navy ink, and ivory paper.', '🇺🇸'],
  ['new-year', 'New Year', 'Midnight black, champagne, and warm gold.', '✨'],
  ...Object.entries(SPORTS_CLUBS).map(([id, club]) => [id, club.label, club.description, { Baseball: '⚾', Basketball: '🏀', Football: '🏈', Hockey: '🏒' }[club.sport]]),
];

export const THEME_CATEGORIES = [
  { id: 'regular', label: 'Regular themes', themes: ['darkhand', 'terminal', 'matrix', 'dark', 'light', 'ocean', 'forest', 'sunset'] },
  { id: 'holiday', label: 'Holiday themes', themes: ['christmas', 'halloween', 'valentine', 'st-patricks', 'independence', 'new-year'] },
  { id: 'sports', label: 'Sports themes', themes: SPORTS_GROUPS.flatMap(group => group.themes), groups: SPORTS_GROUPS },
];

export const THEME_ORDER = THEME_CATEGORIES.flatMap(category => category.themes);

export const REFRESH_OPTIONS = [
  [1500, 'Every 1.5 seconds'],
  [3000, 'Every 3 seconds'],
  [5000, 'Every 5 seconds'],
  [10000, 'Every 10 seconds'],
];
