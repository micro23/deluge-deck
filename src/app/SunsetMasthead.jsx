import React from 'react';

export function SunsetTicketStrip({ children }) {
  return <div className="sunset-ticket-strip">{children}</div>;
}

export function SunsetMasthead() {
  return (
    <header className="core-masthead sunset-masthead" aria-label="Sunset dashboard">
      <strong className="sunset-poster-title">Sunset</strong>
    </header>
  );
}
