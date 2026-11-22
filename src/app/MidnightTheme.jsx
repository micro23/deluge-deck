import React from 'react';

const stars = [
  [-78,-21],[-71,33],[-63,-38],[-57,12],[-51,46],[-43,-62],[-37,-33],[-33,6],[-30,55],
  [-24,-50],[-19,28],[-14,-14],[-7,65],[-5,-71],[8,-42],[14,18],[19,51],[24,-58],
  [29,-9],[33,33],[40,15],[42,-35],[48,-56],[51,51],[62,-29],[63,10],[72,31],[76,-10],
];
const constellations = [
  [[-63,-38],[-37,-33],[-14,-14],[-5,-71]],
  [[-51,46],[-19,28],[14,18],[29,-9],[42,-35],[62,-29]],
  [[-7,65],[19,51],[33,33],[51,51],[72,31]],
];

export function MidnightObservationStrip({ children }) {
  return (
    <section className="midnight-observations" aria-label="Session telemetry">
      <div className="midnight-sky" aria-hidden="true">
        <svg viewBox="-96 -96 192 192" focusable="false">
          <circle className="midnight-brass" r="88" />
          <circle className="midnight-brass" r="83" />
          <circle className="midnight-orbit" r="75" />
          <circle className="midnight-orbit" r="51" />
          <circle className="midnight-orbit" r="24" />
          <path className="midnight-orbit" d="M-75 0h150M0-75v150M-53-53l106 106m0-106L-53 53" />
          <ellipse className="midnight-brass" rx="70" ry="30" transform="rotate(-30)" strokeDasharray="1 3" />
          {Array.from({ length: 60 }, (_, index) => (
            <path className="midnight-brass" key={index} d={index % 5 === 0 ? 'M0 -87v6' : 'M0 -86v3'} transform={`rotate(${index * 6})`} />
          ))}
          {constellations.map((points, index) => (
            <polyline className="midnight-constellation" key={index} points={points.map(point => point.join(',')).join(' ')} />
          ))}
          {stars.map(([x, y], index) => (
            <circle className="midnight-star" key={x} cx={x} cy={y} r={index % 6 === 0 ? 2 : 1} opacity={index % 4 === 0 ? '.5' : '1'} />
          ))}
          <path className="midnight-pole" d="M0-8 2-2 8 0 2 2 0 8-2 2-8 0-2-2Z" />
        </svg>
      </div>
      <div className="midnight-telemetry">
        <h2>Session telemetry</h2>
        {children}
      </div>
    </section>
  );
}
