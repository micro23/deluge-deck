import React from 'react';

// Yankees-specific identity, built around the team's own ballpark history.
function StadiumLines({ className = 'yankees-stadium-lines' }) {
  return <svg className={className} viewBox="0 0 420 110" fill="none" aria-hidden="true">
    <path d="M12 102V57h20v45m12 0V36h18v66m14 0V19h22v83m15 0V44h21v58m15 0V30h20v72m15 0V12h25v90m16 0V34h20v68m14 0V20h22v82m15 0V46h21v56m13 0V33h18v69m14 0V54h22v48" stroke="currentColor" strokeWidth="2" />
    <path d="M8 103h404M26 55h48m15-20h39m83-27h41m17 25h39M0 108h420" stroke="currentColor" strokeWidth="1" />
    <path d="M210 12V0m-5 7h10" stroke="currentColor" strokeWidth="2" />
  </svg>;
}

export function YankeesIdentity({ logo }) {
  return <div className="sports-identity sports-identity-yankees yankees-identity">
    <div className="yankees-crest">
      <StadiumLines />
      <span className="yankees-crest-year">1923</span>
      <img src={logo} alt="New York Yankees" width="88" height="88" />
    </div>
    <span className="yankees-kicker">BRONX · NEW YORK</span>
    <strong className="yankees-wordmark">Yankees</strong>
    <span className="yankees-identity-caption">27-TIME WORLD SERIES CHAMPIONS</span>
    <span className="yankees-heritage">THE HOUSE THAT RUTH BUILT</span>
  </div>;
}

export function YankeesMasthead({ logo }) {
  return <section className="yankees-masthead" aria-label="Yankees heritage">
    <div className="yankees-masthead-art"><StadiumLines /></div>
    <div className="yankees-masthead-lockup">
      <img src={logo} alt="" width="52" height="52" />
      <div><span>NEW YORK · EST. 1903</span><strong>Yankees</strong></div>
    </div>
    <div className="yankees-masthead-story">
      <span className="yankees-opened">YANKEE STADIUM <b>·</b> OPENED 1923</span>
      <span className="yankees-callout">ONE CITY. ONE PINSTRIPE.</span>
      <span className="yankees-titles"><strong>27</strong><small>WORLD SERIES<br />CHAMPIONSHIPS</small></span>
    </div>
  </section>;
}
