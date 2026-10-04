import React from 'react';

export function USAIdentity() {
  return <div className="usa-identity" aria-label="USA, Deluge Deck">
    <svg className="usa-flag-mark" viewBox="0 0 52 32" aria-hidden="true">
      <rect width="52" height="32" fill="#efe7d5" />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} y={i * 64 / 13} width="52" height={32 / 13} fill="#9a4037" />)}
      <rect width="20.8" height={32 * 7 / 13} fill="#14283b" />
      {Array.from({ length: 9 }, (_, row) => Array.from({ length: row % 2 ? 5 : 6 }, (_, col) => {
        const x = (col + (row % 2 ? 1 : .5)) * 20.8 / 6;
        const y = (row + .5) * (32 * 7 / 13) / 9;
        return <path key={`${row}-${col}`} d="M0-.92L.22-.29L.88-.29L.35.1L.55.75L0 .36L-.55.75L-.35.1L-.88-.29L-.22-.29Z" transform={`translate(${x} ${y}) scale(2.15)`} fill="#efe7d5" />;
      }))}
    </svg>
    <strong>USA</strong>
  </div>;
}

export function USAFlagProgress({ progress, id }) {
  const cantonHeight = 100 * 7 / 13;
  return <svg className="independence-flag" viewBox="0 0 190 100" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <clipPath id={`${id}-fill`}><rect width={190 * progress / 100} height="100" /></clipPath>
      <path id={`${id}-star`} d="M0-3L.67-.93L2.85-.93L1.09.35L1.76 2.43L0 1.15L-1.76 2.43L-1.09.35L-2.85-.93L-.67-.93Z" />
    </defs>
    <g clipPath={`url(#${id}-fill)`}>
      <rect width="190" height="100" fill="#fff8ed" />
      {Array.from({ length: 7 }, (_, stripe) => <rect key={stripe} y={stripe * 200 / 13} width="190" height={100 / 13} fill="#b33b32" />)}
      <rect width="76" height={cantonHeight} fill="#18314a" />
      {Array.from({ length: 9 }, (_, row) => Array.from({ length: row % 2 ? 5 : 6 }, (_, col) => {
        const x = (col + (row % 2 ? 1 : .5)) * 76 / 6;
        const y = (row + .5) * cantonHeight / 9;
        return <use key={`${row}-${col}`} href={`#${id}-star`} transform={`translate(${x} ${y})`} fill="#fff8ed" />;
      }))}
    </g>
  </svg>;
}

export function USAMasthead() {
  return <header className="usa-masthead" aria-label="USA: American flag and monuments">
    <h1>USA</h1>
  </header>;
}
