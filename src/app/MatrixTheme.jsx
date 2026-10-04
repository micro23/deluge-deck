import React from 'react';

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
    <div className="matrix-masthead-copy">
      <h1>THE MATRIX</h1>
    </div>
  </header>;
}
