import React from 'react';
import { assetUrl } from './api.js';
import { SPORTS_DESIGNS } from './sports-designs.js';
import { SportsMotif } from './SportsMotif.jsx';
import { MetsIdentity, MetsMasthead } from './MetsBrand.jsx';
import metsLogo from '../assets/sports/mets-logo.svg?inline';
import { YankeesIdentity, YankeesMasthead } from './YankeesBrand.jsx';
import { SportsTitles, SportsVenue } from './SportsHeritage.jsx';
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

import stadiumYankees from '../assets/sports/yankees-stadium-optimized.webp';
import stadiumGiants from '../assets/sports/giants-stadium-optimized.webp';
import stadiumKnicks from '../assets/sports/knicks-stadium-optimized.webp';
import stadiumDodgers from '../assets/sports/dodgers-stadium-optimized.webp';
import stadiumRedSox from '../assets/sports/red-sox-stadium-optimized.webp';
import stadiumBlueJays from '../assets/sports/blue-jays-stadium-optimized.webp';
import stadiumCubs from '../assets/sports/cubs-stadium-optimized.webp';
import stadiumLakers from '../assets/sports/lakers-stadium-optimized.webp';
import stadiumWarriors from '../assets/sports/warriors-stadium-optimized.webp';
import stadiumBulls from '../assets/sports/bulls-stadium-optimized.webp';
import stadiumCavaliers from '../assets/sports/cavaliers-stadium-optimized.webp';
import stadiumHeat from '../assets/sports/heat-stadium-optimized.webp';
import stadiumCowboys from '../assets/sports/cowboys-stadium-optimized.webp';
import stadiumEagles from '../assets/sports/eagles-stadium-optimized.webp';
import stadiumPatriots from '../assets/sports/patriots-stadium-optimized.webp';
import stadiumChiefs from '../assets/sports/chiefs-stadium-optimized.webp';
import stadiumSteelers from '../assets/sports/steelers-stadium-optimized.webp';
import stadiumRangers from '../assets/sports/rangers-stadium-optimized.webp';
import stadiumBlackhawks from '../assets/sports/blackhawks-stadium-optimized.webp';
import stadiumPenguins from '../assets/sports/penguins-stadium-optimized.webp';
import stadiumBruins from '../assets/sports/bruins-stadium-optimized.webp';
import stadiumMapleLeafs from '../assets/sports/maple-leafs-stadium-optimized.webp';
import stadiumCanadiens from '../assets/sports/canadiens-stadium-optimized.webp';
import stadiumMets from '../assets/sports/mets-stadium-optimized.webp';

const LOGOS = { 'mets': metsLogo, 'yankees': logo0, 'giants': logo1, 'knicks': logo2, 'dodgers': logo3, 'red-sox': logo4, 'blue-jays': logo5, 'cubs': logo6, 'lakers': logo7, 'warriors': logo8, 'bulls': logo9, 'cavaliers': logo10, 'heat': logo11, 'cowboys': logo12, 'eagles': logo13, 'patriots': logo14, 'chiefs': logo15, 'steelers': logo16, 'rangers': logo17, 'blackhawks': logo18, 'penguins': logo19, 'bruins': logo20, 'maple-leafs': logo21, 'canadiens': logo22 };

const STADIUMS = {
  'yankees': stadiumYankees,
  'giants': stadiumGiants,
  'knicks': stadiumKnicks,
  'dodgers': stadiumDodgers,
  'red-sox': stadiumRedSox,
  'blue-jays': stadiumBlueJays,
  'cubs': stadiumCubs,
  'lakers': stadiumLakers,
  'warriors': stadiumWarriors,
  'bulls': stadiumBulls,
  'cavaliers': stadiumCavaliers,
  'heat': stadiumHeat,
  'cowboys': stadiumCowboys,
  'eagles': stadiumEagles,
  'patriots': stadiumPatriots,
  'chiefs': stadiumChiefs,
  'steelers': stadiumSteelers,
  'rangers': stadiumRangers,
  'blackhawks': stadiumBlackhawks,
  'penguins': stadiumPenguins,
  'bruins': stadiumBruins,
  'maple-leafs': stadiumMapleLeafs,
  'canadiens': stadiumCanadiens,
  'mets': stadiumMets,
};

export function SportsIdentity({ theme, compact = false, fallback = null }) {
  const club = SPORTS_CLUBS[theme];
  if (!club) return fallback;
  if (theme === 'mets' && !compact) return <MetsIdentity logo={metsLogo} club={club} />;
  if (theme === 'yankees' && !compact) return <YankeesIdentity logo={LOGOS.yankees} club={club} />;
  if (compact) return <div className={`sports-mobile-brand sports-mobile-brand-${theme} ${SPORTS_DESIGNS[theme] ? `sports-lettering-${SPORTS_DESIGNS[theme].lettering}` : ''}`}><img src={LOGOS[theme]} alt={club.name} width="32" height="32" /><strong>{club.short}</strong></div>;
  return (
    <div className={`sports-identity sports-identity-${theme} sports-lettering-${SPORTS_DESIGNS[theme].lettering}`}>
      <div className="sports-logo-stage"><SportsMotif theme={theme} /><img src={LOGOS[theme]} alt={club.name} width="88" height="88" /></div>
      <strong className="sports-wordmark">{club.short}</strong>
      <span className="sports-club-sport">{club.city} · EST. {club.established}</span>
      <SportsTitles club={club} compact />
    </div>
  );
}

export function SportsMasthead({ theme }) {
  const club = SPORTS_CLUBS[theme];
  if (!club) return null;
  if (theme === 'mets') return <MetsMasthead stadium={STADIUMS.mets} club={club} />;
  if (theme === 'yankees') return <YankeesMasthead stadium={STADIUMS.yankees} club={club} />;
  const design = SPORTS_DESIGNS[theme];
  return (
    <div className={`sports-masthead sports-facts-masthead sports-lettering-${design?.lettering || 'serif'}`}>
      <div className="sports-masthead-title">
        <div className="sports-stadium-frame">
          <img src={assetUrl(STADIUMS[theme])} alt={club.venue} className="sports-stadium-thumb" width="96" height="54" />
        </div>
        <div className="sports-name-lockup">
          <span>{club.city} · EST. {club.established}</span>
        </div>
      </div>
      <div className="sports-facts"><SportsVenue club={club} /><SportsTitles club={club} /></div>
      <SportsMotif theme={theme} />
    </div>
  );
}
