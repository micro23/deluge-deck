import React from 'react';
// Hosted Deluge serves the JavaScript bundle rather than Vite's asset directory.
import yankeesLogo from '../assets/sports/yankees-logo.svg?inline';
import giantsLogo from '../assets/sports/giants-logo.svg?inline';
import knicksLogo from '../assets/sports/knicks-logo.svg?inline';

const CLUBS = {
  yankees: { name: 'New York Yankees', short: 'Yankees', sport: 'Baseball', motto: 'PINSTRIPE PRIDE', logo: yankeesLogo },
  giants: { name: 'New York Giants', short: 'Giants', sport: 'Football', motto: 'BIG BLUE', logo: giantsLogo },
  knicks: { name: 'New York Knicks', short: 'Knicks', sport: 'Basketball', motto: 'GARDEN NIGHTS', logo: knicksLogo },
};

export function SportsIdentity({ theme, compact = false, fallback = null }) {
  const club = CLUBS[theme];
  if (!club) return fallback;
  if (compact) return <div className={`sports-mobile-brand sports-mobile-brand-${theme}`}><img src={club.logo} alt={club.name} width="32" height="32" /><strong>{club.short}</strong></div>;
  return (
    <div className={`sports-identity sports-identity-${theme}`}>
      <span className="sports-club-motto" aria-hidden="true">{club.motto}</span>
      <img src={club.logo} alt={club.name} width="88" height="88" />
      <strong>{club.name}</strong>
      <span className="sports-club-sport">{club.sport} · New York</span>
    </div>
  );
}
