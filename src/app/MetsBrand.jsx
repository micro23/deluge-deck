import React from 'react';
import { SportsTitles, SportsVenue } from './SportsHeritage.jsx';

// Mets-only identity: Queens skyline, cap mark, and stadium-style typography.
function QueensSkyline() {
  return <svg className="mets-skyline" viewBox="0 0 360 100" fill="currentColor" aria-hidden="true">
    <path d="M0 100V82h18V54h17v28h10V35h22v47h13V58h18v24h12V20h25v62h12V43h21v39h14V9h20v73h12V50h25v32h12V32h17v50h13V64h19v18h12V48h24v34h12V72h18v28Z" />
    <path d="M119 20V8h5v12M189 9V0h5v9" />
    <path d="M0 90Q180 25 360 90" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>;
}

export function MetsIdentity({ logo, club }) {
  return <div className="sports-identity sports-identity-mets">
    <div className="mets-cap-stage"><QueensSkyline /><img src={logo} alt="New York Mets" width="88" height="88" /></div>
    <strong className="mets-script">Mets</strong>
    <span className="mets-identity-caption">{club.city} · EST. {club.established}</span>
    <SportsTitles club={club} compact />
  </div>;
}

export function MetsMasthead({ stadium, club }) {
  return (
    <div className="sports-masthead mets-masthead sports-facts-masthead">
      <div className="sports-masthead-title">
        <div className="sports-stadium-frame">
          <img src={stadium} alt={club.venue} className="sports-stadium-thumb" width="96" height="54" />
        </div>
        <div className="sports-name-lockup">
          <span>{club.city} · EST. {club.established}</span>
        </div>
      </div>
      <div className="sports-facts"><SportsVenue club={club} /><SportsTitles club={club} /></div>
      <QueensSkyline />
    </div>
  );
}
