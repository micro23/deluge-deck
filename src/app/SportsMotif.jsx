import React from 'react';
import { SPORTS_DESIGNS } from './sports-designs.js';

// Architectural and material signatures supplement each club's existing logo.
export function SportsMotif({ theme, className = 'sports-motif' }) {
  const design = SPORTS_DESIGNS[theme];
  if (!design) return null;
  return <svg className={className} aria-hidden="true" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={design.motif} /></svg>;
}
