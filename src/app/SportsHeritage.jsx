import React from 'react';

export const championshipLabel = sport => ({ Baseball: 'WORLD SERIES', Basketball: 'NBA', Football: 'SUPER BOWL', Hockey: 'STANLEY CUP' })[sport];

export function SportsTitles({ club, compact = false }) {
  return compact
    ? <span className="sports-title-caption">{club.titles} {championshipLabel(club.sport)} {club.titles === 1 ? 'TITLE' : 'TITLES'}</span>
    : <div className="sports-title-banner"><strong>{club.titles}</strong><small>{championshipLabel(club.sport)}<br />{club.titles === 1 ? 'CHAMPIONSHIP' : 'CHAMPIONSHIPS'}</small></div>;
}

export function SportsVenue({ club }) {
  return <div className="sports-venue"><strong>{club.venue}</strong><span>OPENED {club.opened}<b className="sports-mobile-year"> · EST. {club.established}</b></span></div>;
}
