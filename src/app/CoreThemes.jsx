import React from 'react';

export const CORE_THEMES = { dark:'Midnight', light:'Paper', ocean:'Ocean', forest:'Forest', sunset:'Sunset' };

export function CoreMark({ theme, className = '' }) {
  const drawing = {
    dark:<><path d="M28 5A17 17 0 1 0 36 31 16 16 0 0 1 28 5Z" /><path d="M35 7v8m-4-4h8M17 5v4m-2-2h4" /></>,
    light:<><path d="M8 7h19l8 8v23H8Zm19 0v8h8M14 22h15m-15 6h15m-15 6h9" /><path d="M4 12v30h26" /></>,
    ocean:<><path d="M3 21c7-12 15-12 22 0 7 12 14 12 17 6M3 29c7-12 15-12 22 0 7 12 14 12 17 6M10 13c6-6 12-6 18 0" /></>,
    forest:<><path d="M9 35C-1 14 18 5 36 6c3 20-7 33-27 29ZM9 35 30 12M16 27l-1-11m8 3 11 1M9 35l-5 7" /></>,
    sunset:<><path d="M9 23a13 13 0 0 1 26 0M3 23h38M7 29h30M11 35h22M16 41h12M22 2v4M5 8l4 4m26 0 4-4" /></>,
  }[theme];
  return <svg className={`core-mark ${className}`} viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>;
}

export function CoreIdentity({ theme, compact = false, fallback = null }) {
  if (!CORE_THEMES[theme]) return fallback;
  return <div className={`core-identity${compact ? ' compact' : ''}`} aria-label={`${CORE_THEMES[theme]} theme`}><CoreMark theme={theme} /></div>;
}

function CoreArtwork({ theme }) {
  const art = {
    dark:<><path d="M75 126h330M95 126V82h78v44m17 0V57h89v69m17 0V34h82v92"/><path d="M207 57V38h54v19m-42-19V24h30v14M296 75h55m-55 13h55m-55 13h55M108 95h48m-48 13h48"/><circle cx="337" cy="51" r="13"/><path d="M337 18v10m0 46v10m-33-33h10m46 0h10m-56-23 7 7m32 32 7 7m0-46-7 7m-32 32-7 7"/></>,
    light:<><path d="M86 37h230v102H86zM99 49h204v78H99zM109 139h184M125 127v12m150-12v12M72 145h260"/><path d="M121 67h43v60h-43zm59-7h42v67h-42zm57 17h48v50h-48z"/><path d="M132 80h21m-21 11h21m-21 11h21m37-30h21m-21 11h21m-21 11h21m37-8h26m-26 11h26"/><circle cx="350" cy="57" r="24"/><path d="M350 26v8m0 46v8m-31-31h8m46 0h8"/></>,
    ocean:<><path d="M57 121c28-23 55-23 83 0s55 23 83 0 55-23 83 0 55 23 83 0 55-23 83 0M57 143c28-23 55-23 83 0s55 23 83 0 55-23 83 0 55 23 83 0 55-23 83 0"/><path d="M100 93h76l18-37h71l22 37h79v28H100z"/><path d="M211 56V37h40v19m-31-19V25h22v12M123 100v15m19-15v15m20-15v15m141-15v15m20-15v15m19-15v15"/><circle cx="337" cy="49" r="12"/><path d="M337 23v8m0 36v8m-26-26h8m36 0h8"/></>,
    forest:<><path d="M82 139c38-57 75-86 132-104-6 45-25 81-62 104M148 139c21-48 56-79 112-99 4 42-15 76-51 99M214 139c18-39 53-63 105-73 1 34-18 59-51 73M82 139h267"/><path d="M114 111c-22-7-33-22-36-43 25-1 44 10 52 33m68-32c-6-23 1-41 18-57 17 17 20 36 7 57m68 12c12-21 30-31 55-28-6 24-21 38-47 41"/><circle cx="363" cy="115" r="20" strokeDasharray="2 6"/></>,
    sunset:<><path d="M72 136h300M103 136a115 115 0 0 1 230 0"/><path d="M117 112h202M128 91h180M146 70h144M173 51h90M200 35h36"/><path d="M58 136l55-22 47 22 62-28 49 28 54-19 62 19"/><path d="M105 149h238M137 160h175"/></>,
  }[theme];
  return <svg className="core-artwork" viewBox="0 0 440 160" fill="none" stroke="currentColor" strokeWidth=".8" aria-hidden="true">{art}</svg>;
}

export function CoreMasthead({ theme }) {
  if (!CORE_THEMES[theme]) return null;
  return <header className="core-masthead" aria-label={`${CORE_THEMES[theme]} theme artwork`}><CoreArtwork theme={theme} /></header>;
}

export function CoreStatIcon({ theme, label }) {
  const frame = {
    dark:<><path d="M3 11V3h8m10 0h8v8m0 10v8h-8m-10 0H3v-8" /><circle cx="16" cy="16" r="14" strokeDasharray="1 8" /></>,
    light:<><path d="M5 3h18l5 5v21H5Zm18 0v5h5M2 8v23h21" /></>,
    ocean:<><circle cx="16" cy="16" r="14" /><circle cx="16" cy="16" r="11" strokeDasharray="1 5" /></>,
    forest:<path d="M4 4h15c8 0 10 3 10 10v15H14C6 29 4 25 4 18Z" />,
    sunset:<><path d="M3 20V16a13 13 0 0 1 26 0v4ZM3 24h26M8 28h16" /></>,
  }[theme];
  const mark = {
    Download:<path d="M16 9v12m-4-4 4 4 4-4M11 24h10" />,
    Upload:<path d="M16 22V10m-4 4 4-4 4 4M11 24h10" />,
    Connections:<><circle cx="16" cy="13" r="2" /><path d="M16 15v4m-5 3v-3h10v3" /><circle cx="11" cy="24" r="2" /><circle cx="21" cy="24" r="2" /></>,
    Library:<><path d="M10 10h12v13H10ZM13 7h12v13M7 13v13h12M13 14h6m-6 4h6" /></>,
  }[label];
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><g className="core-icon-frame">{frame}</g>{mark}</svg>;
}

export function CoreProgress({ theme, progress, state, id }) {
  const pattern = {
    dark:<><rect x="1" y="3" width="6" height="14" rx="1" fill="currentColor" /><path d="M3 5v10" stroke="#ffffff" strokeOpacity=".35" /></>,
    light:<><rect width="10" height="20" fill="currentColor" /><path d="M2 0v20M5 0v20M8 0v20" stroke="#fffdf6" strokeOpacity=".25" /></>,
    ocean:<><rect width="40" height="20" fill="currentColor" /><path className="core-water" d="M-40 7c10-8 10 8 20 0s10 8 20 0 10 8 20 0 10 8 20 0 10 8 20 0 10 8 20 0M-40 14c10-8 10 8 20 0s10 8 20 0 10 8 20 0 10 8 20 0 10 8 20 0 10 8 20 0" fill="none" stroke="#052c3b" strokeOpacity=".6" /></>,
    forest:<><path d="M0 10h24" stroke="currentColor" strokeWidth="2" /><path d="M7 10C0 9 0 3 2 2c5 0 8 3 5 8ZM17 10c7 1 7 7 5 8-5 0-8-3-5-8Z" fill="currentColor" /></>,
    sunset:<><rect width="40" height="20" fill={`url(#${id}-dusk)`} /><path d="M0 4h40M0 8h40M0 12h40M0 16h40" stroke="#311409" strokeOpacity=".28" /></>,
  }[theme];
  return <svg className={`core-progress ${state}${progress >= 99.95 ? ' complete' : ''}`} aria-hidden="true">
    <defs><linearGradient id={`${id}-dusk`} x2="0" y2="1"><stop stopColor="#ffe4b0" /><stop offset="1" stopColor="#e598bf" /></linearGradient><pattern id={`${id}-meter`} width={theme === 'forest' ? 24 : ['ocean','sunset'].includes(theme) ? 40 : 10} height="20" patternUnits="userSpaceOnUse">{pattern}</pattern><clipPath id={`${id}-clip`}><rect width={`${progress}%`} height="100%" /></clipPath></defs>
    <g clipPath={`url(#${id}-clip)`}><rect width="100%" height="100%" fill={`url(#${id}-meter)`} /></g>
  </svg>;
}
