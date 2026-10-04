import React from 'react';
import { SPORTS_DESIGNS } from './sports-designs.js';
import { SportsMotif } from './SportsMotif.jsx';
import { MetsIdentity, MetsMasthead } from './MetsBrand.jsx';
import metsLogo from '../assets/sports/mets-logo.svg?inline';
// All logos are inline for Deluge's self-contained JavaScript resource.
import { SPORTS_CLUBS } from './sports-clubs.js';
import logo0 from '../assets/sports/yankees-logo.svg?inline';
import logo1 from '../assets/sports/giants-logo.svg?inline';
import logo2 from '../assets/sports/knicks-logo.svg?inline';
import logo3 from '../assets/sports/dodgers-logo.svg?inline';
import logo4 from '../assets/sports/red-sox-logo.svg?inline';
import logo5 from '../assets/sports/blue-jays-logo.svg?inline';
import logo6 from '../assets/sports/cubs-logo.svg?inline';
import logo7 from '../assets/sports/lakers-logo.svg?inline';
import logo8 from '../assets/sports/warriors-logo.svg?inline';
import logo9 from '../assets/sports/bulls-logo.svg?inline';
import logo10 from '../assets/sports/cavaliers-logo.svg?inline';
import logo11 from '../assets/sports/heat-logo.svg?inline';
import logo12 from '../assets/sports/cowboys-logo.svg?inline';
import logo13 from '../assets/sports/eagles-logo.svg?inline';
import logo14 from '../assets/sports/patriots-logo.svg?inline';
import logo15 from '../assets/sports/chiefs-logo.svg?inline';
import logo16 from '../assets/sports/steelers-logo.svg?inline';
import logo17 from '../assets/sports/rangers-logo.svg?inline';
import logo18 from '../assets/sports/blackhawks-logo.svg?inline';
import logo19 from '../assets/sports/penguins-logo.svg?inline';
import logo20 from '../assets/sports/bruins-logo.svg?inline';
import logo21 from '../assets/sports/maple-leafs-logo.svg?inline';
import logo22 from '../assets/sports/canadiens-logo.svg?inline';

const LOGOS = { 'mets': metsLogo, 'yankees': logo0, 'giants': logo1, 'knicks': logo2, 'dodgers': logo3, 'red-sox': logo4, 'blue-jays': logo5, 'cubs': logo6, 'lakers': logo7, 'warriors': logo8, 'bulls': logo9, 'cavaliers': logo10, 'heat': logo11, 'cowboys': logo12, 'eagles': logo13, 'patriots': logo14, 'chiefs': logo15, 'steelers': logo16, 'rangers': logo17, 'blackhawks': logo18, 'penguins': logo19, 'bruins': logo20, 'maple-leafs': logo21, 'canadiens': logo22 };

export function SportsIdentity({ theme, compact = false, fallback = null }) {
  const club = SPORTS_CLUBS[theme];
  if (!club) return fallback;
  if (theme === 'mets' && !compact) return <MetsIdentity logo={metsLogo} />;
  if (compact) return <div className={`sports-mobile-brand sports-mobile-brand-${theme} ${SPORTS_DESIGNS[theme] ? `sports-lettering-${SPORTS_DESIGNS[theme].lettering}` : ''}`}><img src={LOGOS[theme]} alt={club.name} width="32" height="32" /><strong>{club.short}</strong></div>;
  return (
    <div className={`sports-identity sports-identity-${theme} sports-lettering-${SPORTS_DESIGNS[theme].lettering}`}>
      <span className="sports-club-motto" aria-hidden="true">{club.motto}</span>
      <div className="sports-logo-stage"><SportsMotif theme={theme} /><img src={LOGOS[theme]} alt={club.name} width="88" height="88" /></div>
      <strong className="sports-wordmark">{club.short}</strong>
      <span className="sports-club-sport">{club.sport} · {club.city}</span>
    </div>
  );
}

export function SportsMasthead({ theme }) {
  const club = SPORTS_CLUBS[theme];
  if (!club) return null;
  if (theme === 'mets') return <MetsMasthead />;
  const design = SPORTS_DESIGNS[theme];
  return <div className={`sports-masthead sports-lettering-${design.lettering}`}>
    <span>{club.city.toUpperCase()}<br />{club.sport.toUpperCase()}</span>
    <div className="sports-masthead-title"><img src={LOGOS[theme]} alt="" width="42" height="42" /><strong>{club.short}</strong></div>
    <span>{club.motto}</span>
    <SportsMotif theme={theme} />
  </div>;
}
