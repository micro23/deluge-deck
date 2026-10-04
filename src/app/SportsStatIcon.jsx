import React from 'react';
import { SPORTS_CLUBS } from './sports-clubs.js';

// Vector equipment marks remain crisp in the standalone UI and packaged egg.
export function SportsStatIcon({ theme, label }) {
  const sport = SPORTS_CLUBS[theme]?.sport;
  if (!sport) return null;
  const equipment = {
    Baseball: <><circle cx="17" cy="17" r="12" /><path className="sports-icon-seam" d="M9 8c10 4 10 14 0 18m16-18c-10 4-10 14 0 18m-14-15 3-2m-1 8 3-1m-3 8 3 1m8-14-3-2m1 8-3-1m3 8-3 1" /></>,
    Basketball: <><circle cx="17" cy="17" r="12" /><path d="M5 17h24M17 5v24M9 8c9 4 9 14 0 18m16-18c-9 4-9 14 0 18" /></>,
    Football: <><path d="M6 28C3 13 12 4 28 6c2 16-7 25-22 22Z" /><path d="m10 24 14-14m-12 6 6 6m-3-9 6 6M6 16l12 12M16 6l12 12" /></>,
    Hockey: <><path d="m5 5 10 19 13 3v-5l-10-2L10 3m18 2L18 24 5 27v-5l10-2L23 3" /><ellipse cx="17" cy="29" rx="5" ry="2" /><path d="M12 29v3c3 2 7 2 10 0v-3" /></>,
  }[sport];
  const functionMark = {
    Download: <path d="M30 26v9m-4-4 4 4 4-4M25 37h10" />,
    Upload: <path d="M30 36v-9m-4 4 4-4 4 4M25 37h10" />,
    Connections: <><circle cx="30" cy="27" r="2" /><path d="M30 29v3m-5 2v-2h10v2" /><rect x="23" y="34" width="4" height="4" rx="1" /><rect x="33" y="34" width="4" height="4" rx="1" /></>,
    Library: <><path d="M26 27h8v5l-4 3-4-3Zm0 2h-3v2l3 2m8-4h3v2l-3 2m-4 2v3m-4 0h8" /></>,
  }[label];
  return <svg className={`sports-stat-icon sports-stat-icon-${sport.toLowerCase()}`} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {equipment}<circle className="sports-icon-action-disc" cx="30" cy="32" r="9" fill="#071326" stroke="none" />{functionMark}
  </svg>;
}
