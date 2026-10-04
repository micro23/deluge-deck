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
  return <div className={`core-identity${compact ? ' compact' : ''}`}><CoreMark theme={theme} /><strong>{CORE_THEMES[theme]}</strong></div>;
}

function CoreArtwork({ theme }) {
  const art = {
    dark:<><g className="core-orbit"><circle cx="260" cy="82" r="60" strokeDasharray="1 12" /><ellipse cx="260" cy="82" rx="93" ry="28" transform="rotate(-25 260 82)" /><circle cx="340" cy="48" r="4" fill="currentColor" /></g><circle cx="260" cy="82" r="44" /><path d="M260 10v144M188 82h144M102 45l36 32 37-11m-37 11-12 43" /><circle cx="102" cy="45" r="3" /><circle cx="138" cy="77" r="3" /><circle cx="175" cy="66" r="3" /><path d="M337 18h50m-25-5v10M346 137h46" /></>,
    light:<><path d="M105 128V43h215v85M123 128V62h180v66M142 128V80h142v48M105 43l107-30 108 30M85 128h257M212 13v115M123 62h180M142 80h142" /><circle cx="212" cy="62" r="45" strokeDasharray="2 7" /><path d="M362 32v85m-10-74h20m-20 15h12m-12 15h20m-20 15h12m-12 15h20M65 30h18m-9-9v18" /></>,
    ocean:<><g className="core-current"><path d="M5 100c45-65 85 65 130 0s85 65 130 0 85 65 130 0 85 65 130 0M5 120c45-65 85 65 130 0s85 65 130 0 85 65 130 0 85 65 130 0M5 140c45-65 85 65 130 0s85 65 130 0 85 65 130 0 85 65 130 0" /></g><circle cx="294" cy="56" r="43" /><circle cx="294" cy="56" r="30" strokeDasharray="1 7" /><path d="M294 13v13m43 30h-13m-30 43V86m-43-30h13M294 56l22-22" /><circle cx="294" cy="56" r="3" fill="currentColor" /></>,
    forest:<><g className="core-canopy"><path d="M120 152C158 106 236 66 335 16M173 110C121 105 105 64 115 38c40 5 71 27 58 72ZM223 78c-17-52 8-76 40-77 12 35 3 65-40 77ZM265 56c46 34 80 21 94-7-32-23-67-24-94 7ZM309 29c5-32 31-43 52-39" /><path d="m128 53 45 57m61-97-11 65m119-22-77 0" /></g><circle cx="94" cy="117" r="28" strokeDasharray="1 8" /><path d="M77 117h34m-17-17v34" /></>,
    sunset:<><circle className="core-sun" cx="278" cy="77" r="54" /><path d="M196 77h164M207 88h142M215 99h127M228 110h100M239 121h78M253 132h50M68 137l76-42 65 42 72-17 103 17M112 48h48m-24-24v48" /><path d="M248 22h60M230 33h96M222 44h112M216 55h123" /></>,
  }[theme];
  return <svg className="core-artwork" viewBox="0 0 440 160" fill="none" stroke="currentColor" strokeWidth=".8" aria-hidden="true">{art}</svg>;
}

export function CoreMasthead({ theme }) {
  if (!CORE_THEMES[theme]) return null;
  return <header className="core-masthead"><div className="core-masthead-title"><CoreMark theme={theme} /><h1>{CORE_THEMES[theme]}</h1></div><CoreArtwork theme={theme} /></header>;
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
