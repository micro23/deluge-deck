import React from 'react';

export function USAIdentity() {
  return <div className="usa-identity" aria-label="USA, Deluge Deck">
    <svg className="usa-flag-mark" viewBox="0 0 52 32" aria-hidden="true">
      <rect width="52" height="32" fill="#efe7d5" />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} y={i * 64 / 13} width="52" height={32 / 13} fill="#9a4037" />)}
      <rect width="23" height={224 / 13} fill="#14283b" />
      {Array.from({ length: 13 }, (_, i) => {
        const a = i * Math.PI * 2 / 13 - Math.PI / 2;
        return <circle key={i} cx={11.5 + Math.cos(a) * 6} cy={8.6 + Math.sin(a) * 6} r=".7" fill="#efe7d5" />;
      })}
    </svg>
    <strong>USA</strong>
  </div>;
}

export function USAMasthead() {
  return <header className="usa-masthead" aria-label="USA: American flag and monuments">
    <h1>USA</h1>
  </header>;
}
