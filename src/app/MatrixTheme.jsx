import React from 'react';

const CODE_ROWS = ['ｱ01ﾐ7ﾈ3', '9ﾜｶ2ﾘ0ｲ', 'ﾆ4ｻ0ﾖ8ﾄ', '1ﾊ6ﾏﾂ3ﾅ'];

export function MatrixCodeProgress({ progress, state, id }) {
  return <svg className={`matrix-code-progress ${state}${progress >= 99.95 ? ' complete' : ''}`} aria-hidden="true">
    <defs>
      <pattern id={`${id}-code`} width="56" height="40" patternUnits="userSpaceOnUse">
        {CODE_ROWS.map((row, index) => <text key={row} x="1" y={9 + index * 10} textLength="54" lengthAdjust="spacingAndGlyphs" fill={index === 0 ? '#d8ffe5' : '#8dffb5'} fontSize="9" fontFamily="monospace">{row}</text>)}
      </pattern>
      <clipPath id={`${id}-reveal`}><rect width={`${progress}%`} height="100%" /></clipPath>
    </defs>
    <g clipPath={`url(#${id}-reveal)`}>
      <rect width="100%" height="100%" fill="#0c2c1b" />
      <rect className="matrix-code-flow" y="-40" width="100%" height="200" fill={`url(#${id}-code)`} />
    </g>
    {progress > 0 && progress < 99.95 && <rect className="matrix-code-front" x={`${progress}%`} width="1.5" height="100%" fill="#d8ffe5" />}
  </svg>;
}

export function MatrixStatIcon({ label }) {
  const mark = {
    Download: <path d="M16 9v14m-5-5 5 5 5-5M10 26h12" />,
    Upload: <path d="M16 23V9m-5 5 5-5 5 5M10 26h12" />,
    Connections: <><circle cx="16" cy="16" r="3" /><path d="M16 7v6m0 6v6M7 16h6m6 0h6" /><circle cx="16" cy="6" r="1" /><circle cx="16" cy="26" r="1" /><circle cx="6" cy="16" r="1" /><circle cx="26" cy="16" r="1" /></>,
    Library: <><path d="m7 12 9-5 9 5-9 5Zm0 5 9 5 9-5m-18 5 9 5 9-5" /></>,
  }[label];
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="matrix-icon-frame" d="M2 11V2h9m10 0h9v9m0 10v9h-9m-10 0H2v-9" />{mark}</svg>;
}

function MatrixRain() {
  return <div className="matrix-rain" aria-hidden="true">{Array.from({ length: 22 }, (_, column) => <span key={column} style={{ '--rain-duration':`${7 + column % 6}s`, '--rain-delay':`${-column * 1.73}s` }}>{Array.from({ length: 56 }, (_, row) => CODE_ROWS[(column + row) % 4][(column * 3 + row) % 7]).join('\n')}</span>)}</div>;
}

export function MatrixMark({ className = '' }) {
  return <svg className={`matrix-mark ${className}`} viewBox="0 0 36 44" fill="none" aria-hidden="true">
    <path d="M5 13v18M12 5v34M19 14v17M26 3v38M33 12v19" stroke="currentColor" strokeWidth="1.4" />
    <path d="m3 19 2-3 2 3m10 3 2 3 2-3m10-2 2-3 2 3" stroke="currentColor" strokeWidth="1.4" />
  </svg>;
}

export function MatrixIdentity() {
  return <div className="matrix-identity" aria-label="The Matrix, Deluge Deck">
    <MatrixMark />
    <span><strong>THE MATRIX</strong><small>DELUGE DECK</small></span>
  </div>;
}

export function MatrixMasthead() {
  return <header className="matrix-masthead" aria-label="The Matrix">
    <MatrixRain />
    <div className="matrix-masthead-copy">
      <h1>THE MATRIX</h1>
    </div>
  </header>;
}
