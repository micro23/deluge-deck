import React from 'react';

// Decorative artwork only: adjacent values and sparklines remain real telemetry.
export function ThemeDetail({ theme, side = 'right' }) {
  if (theme === 'independence') {
    return <span className={`theme-detail theme-detail-${side}`} aria-hidden="true" />;
  }
  const art = {
    yankees: <><circle cx="60" cy="60" r="43" /><path d="M30 29c31 13 31 49 0 62m60-62c-31 13-31 49 0 62" /><path d="m31 35 8-5m-1 14 8-5m-4 15 8-3m-6 13 8-1m-8 12 8 2m-11 9 8 4m30-43-8-5m1 14-8-5m4 15-8-3m6 13-8-1m8 12-8 2m11 9-8 4" /></>,
    giants: <><path d="M17 98C12 45 44 13 102 18c5 57-27 90-85 80Z" /><path d="m32 87 55-55M46 59l15 15m-7-24 15 15m-6-24 15 15M24 63l33 33m6-72 33 33" /></>,
    knicks: <><circle cx="60" cy="60" r="43" /><path d="M17 60h86M60 17v86M29 30c31 15 31 45 0 60m62-60c-31 15-31 45 0 60" /></>,
    dark: <><circle cx="60" cy="60" r="44" /><circle cx="60" cy="60" r="30" /><circle cx="60" cy="60" r="15" /><path d="M60 7v18m0 70v18M7 60h18m70 0h18M29 29l62 62M29 91l62-62" /><path className="detail-sweep" d="M60 60V16a44 44 0 0 1 44 44Z" /><circle className="detail-light" cx="82" cy="38" r="3" /></>,
    light: <><path d="M18 24h84v72H18zM24 32h72M24 88h72M60 24v72" /><circle cx="60" cy="60" r="23" /><path d="m60 32 7 21 21 7-21 7-7 21-7-21-21-7 21-7Z" /><path d="M11 24v72m98-72v72M18 18h84M18 102h84" /><circle cx="60" cy="60" r="3" /></>,
    ocean: <><path d="M12 42c16-17 32 17 48 0s32 17 48 0M12 61c16-17 32 17 48 0s32 17 48 0M12 80c16-17 32 17 48 0s32 17 48 0" /><circle cx="60" cy="60" r="47" strokeDasharray="2 7" /><circle className="detail-light" cx="24" cy="24" r="4" /><circle cx="92" cy="95" r="6" /><circle cx="100" cy="21" r="2" /></>,
    forest: <><path d="M24 105C72 82 38 41 94 14M48 82C15 82 12 58 18 50c25-1 36 12 30 32ZM57 62c27 3 40-10 39-26-24-3-38 8-39 26ZM68 40c-22 2-32-11-30-25 22-1 34 10 30 25Z" /><path d="m18 50 30 32m48-46L57 62M38 15l30 25" /><circle className="detail-light" cx="87" cy="83" r="3" /><circle cx="20" cy="23" r="2" /></>,
    sunset: <><circle cx="60" cy="53" r="25" /><path d="M9 65h102M16 74h88M23 83h74M32 92h56M43 101h34M60 13v8M24 24l6 6m60 0 6-6M11 50h8m82 0h8" /><path d="m12 65 22-14 24 14 31-12 19 12" /></>,
    'st-patricks': <><path d="M60 59C24 54 16 26 35 19 54 12 64 31 60 59ZM60 59c-5-36 15-55 31-41 17 16-1 38-31 41ZM60 59c35-7 55 14 41 30-15 18-38 0-41-30ZM60 59C24 52 6 74 21 89c16 17 38-2 39-30ZM60 59c7 20 9 31-1 47" /><circle cx="60" cy="59" r="45" strokeDasharray="2 5" /><path d="M8 8h19M8 8v19m104 85H93m19 0V93" /></>,
    christmas: <><path d="m60 12 13 22h-7l20 25H74l25 30H21l25-30H34l20-25h-7ZM54 89v15h12V89" /><path d="M42 52c13 8 23 9 37 7M34 76c18 9 35 12 55 4" /><circle className="detail-light" cx="56" cy="43" r="3" /><circle cx="70" cy="71" r="3" /></>,
    halloween: <><path d="M60 15c25 0 42 20 42 45s-17 45-42 45S18 85 18 60s17-45 42-45Z" /><path d="M60 15v90M18 60h84M29 28l62 64m0-64L29 92M60 30c16 0 28 13 28 30S76 90 60 90 32 77 32 60s12-30 28-30Z" /><circle cx="60" cy="60" r="12" /></>,
    valentine: <><path d="M60 91 24 54C1 29 35 10 60 35c25-25 59-6 36 19Z" /><path d="M12 98c26-1 27-24 16-24-12 0-8 14 3 12m77 12c-26-1-27-24-16-24 12 0 8 14-3 12M37 105h46" /><path d="m60 7 3 7-3 7-3-7Z" /></>,
    independence: <><path d="m60 19 10 27 29 1-23 18 8 28-24-16-24 16 8-28-23-18 29-1Z" /><circle cx="60" cy="60" r="49" strokeDasharray="2 6" /><path d="M10 106h100M19 113h82" /></>,
    'new-year': <><path d="M60 12v23m0 50v23M12 60h23m50 0h23M26 26l16 16m36 36 16 16M26 94l16-16m36-36 16-16M42 16l8 21m20 46 8 21M16 42l21 8m46 20 21 8M16 78l21-8m46-20 21-8M42 104l8-21m20-46 8-21" /><path d="m60 43 5 12 12 5-12 5-5 12-5-12-12-5 12-5Z" /></>,
    terminal: <><path d="M14 24h92v72H14zM14 39h92M25 30h2m6 0h2m6 0h2M28 53l11 9-11 9m21 0h22" /><path className="detail-light" d="M78 71h15" /></>,
  }[theme];
  return <svg className={`theme-detail theme-detail-${side}`} aria-hidden="true" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">{art}</svg>;
}
