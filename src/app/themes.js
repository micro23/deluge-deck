import { SPORTS_CLUBS, SPORTS_GROUPS } from './sports-clubs.js';

export const THEMES = [
  ['darkhand', 'Darkhand', 'Low-glare charcoal cards, Deluge blue, and live transfer history.', '💧'],
  ['terminal', 'Terminal', 'A high-contrast operator console in pure black, white, and hard-edged mono.', '📟'],
  ['matrix', 'The Matrix', 'Rain soaked code, phosphor green telemetry, and a dark digital city.', '🟢'],
  ['dark', 'Midnight', 'A night observatory with a brass star dial and a right-hand navigation rail.', '🌙'],
  ['light', 'Paper', 'A ring-bound notebook with ivory pages, ruled columns, and ink lettering.', '📝'],
  ['ocean', 'Ocean', 'A submersible console with live transfer traces and a library sonar.', '🌊'],
  ['forest', 'Forest', 'Botanical parchment, pine-green rails, and growing leaf meters.', '🌲'],
  ['sunset', 'Sunset', 'A desert railway print with punched tickets and a transfer manifest.', '🌅'],
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
