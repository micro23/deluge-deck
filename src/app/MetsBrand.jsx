import React from 'react';

// Mets-only identity: Queens skyline, cap mark, and stadium-style typography.
function QueensSkyline() {
  return <svg className="mets-skyline" viewBox="0 0 360 100" fill="currentColor" aria-hidden="true">
    <path d="M0 100V82h18V54h17v28h10V35h22v47h13V58h18v24h12V20h25v62h12V43h21v39h14V9h20v73h12V50h25v32h12V32h17v50h13V64h19v18h12V48h24v34h12V72h18v28Z" />
    <path d="M119 20V8h5v12M189 9V0h5v9" />
    <path d="M0 90Q180 25 360 90" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>;
}

export function MetsIdentity({ logo }) {
  return <div className="sports-identity sports-identity-mets">
    <span className="sports-club-motto">QUEENS · NEW YORK</span>
    <div className="mets-cap-stage"><QueensSkyline /><img src={logo} alt="New York Mets" width="88" height="88" /></div>
    <strong className="mets-script">Mets</strong>
    <span className="mets-identity-caption">NEW YORK BASEBALL</span>
  </div>;
}

export function MetsMasthead() {
  return <div className="mets-masthead">
    <span>QUEENS, NEW YORK</span>
    <div><small>NEW YORK</small><strong>Mets</strong></div>
    <span>BLUE &amp; ORANGE</span>
    <QueensSkyline />
  </div>;
}
