import React from 'react';

export function ForestMark({ className = '' }) {
  return (
    <svg
      className={`forest-mark ${className}`}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="forest-mark-glow" cx="50%" cy="45%" r="50%">
          <stop stopColor="#efffba" stopOpacity=".8" />
          <stop offset="60%" stopColor="#76d48b" stopOpacity=".3" />
          <stop offset="100%" stopColor="#19342b" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer sacred botanical ring */}
      <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="1.2" opacity=".4" strokeDasharray="3 3" />
      <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="22" cy="22" r="14" fill="url(#forest-mark-glow)" opacity=".4" />
      {/* Ancient Tree of Life / Yggdrasil trunk & roots */}
      <path
        d="M22 28v-9M19 28c0-3 3-5 3-9M25 28c0-3-3-5-3-9M17 34c2-2 4-4 5-6M27 34c-2-2-4-4-5-6M22 36v-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Redwood canopy branches and leaves */}
      <path
        d="M22 19c-5-2-9-7-7-13 7 1 9 6 7 13ZM22 19c5-2 9-7 7-13-7 1-9 6-7 13ZM22 15c-3-3-4-8 0-10 4 2 3 7 0 10ZM15 22c-4-2-7-6-4-10 5 1 6 5 4 10ZM29 22c4-2 7-6 4-10-5 1-6 5-4 10Z"
        fill="currentColor"
        fillOpacity=".45"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Glowing heartwood spore */}
      <circle cx="22" cy="19" r="2" fill="#efffba" />
    </svg>
  );
}

export function ForestIdentity({ compact = false }) {
  return (
    <div
      className={`forest-identity${compact ? ' compact' : ''}`}
      aria-label="Forest Sylvan Canopy theme, Deluge Deck"
    >
      <ForestMark />
      <span>
        <strong>FOREST</strong>
        <small>SYLVAN CANOPY</small>
      </span>
    </div>
  );
}

export function ForestStatIcon({ label }) {
  const mark = {
    // Download: Sprouting seedling root drawing golden-emerald nutrients downward into the earth
    Download: (
      <>
        {/* Descending nutrient root & arrow */}
        <path d="M16 6v14m-5-5 5 5 5-5" strokeWidth="1.8" />
        {/* Sprouting twin seedling leaves */}
        <path d="M16 8C12 5 10 9 16 11M16 8C20 5 22 9 16 11" fill="currentColor" fillOpacity=".3" />
        {/* Glowing nutrient dewdrop at the tip */}
        <circle cx="16" cy="25" r="2" fill="currentColor" />
        <path d="M10 27c3-1 9-1 12 0" opacity=".6" />
      </>
    ),
    // Upload: Towering redwood crown branches reaching upward to the sun
    Upload: (
      <>
        {/* Ascending trunk & upward arrow */}
        <path d="M16 26V12m-5 5 5-5 5 5" strokeWidth="1.8" />
        {/* Radiant sun crown fronds */}
        <path d="M16 10C11 7 10 2 16 4M16 10C21 7 22 2 16 4" fill="currentColor" fillOpacity=".3" />
        {/* Sunbeam burst at the apex */}
        <circle cx="16" cy="4" r="1.5" fill="currentColor" />
        <path d="M12 28h8" opacity=".6" />
      </>
    ),
    // Connections: Interconnected mycelium fungal network with glowing spore nodes
    Connections: (
      <>
        <circle cx="16" cy="16" r="3.5" fill="currentColor" fillOpacity=".3" strokeWidth="1.6" />
        <circle cx="7" cy="11" r="2" fill="currentColor" />
        <circle cx="25" cy="11" r="2" fill="currentColor" />
        <circle cx="9" cy="23" r="2" fill="currentColor" />
        <circle cx="23" cy="23" r="2" fill="currentColor" />
        {/* Hyphae connecting channels */}
        <path d="M16 12.5V7M16 19.5v5M13 14 8.5 12M19 14l4.5-2M13 18l-4.5 3.5M19 18l4.5 3.5" strokeDasharray="1 1.5" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="1.2" fill="#efffba" />
      </>
    ),
    // Library: Ancient sacred concentric tree rings & botanical tome
    Library: (
      <>
        {/* Concentric heartwood rings of the ancient redwood */}
        <circle cx="16" cy="16" r="12" strokeDasharray="2 3" opacity=".5" />
        <circle cx="16" cy="16" r="8" strokeDasharray="3 2" opacity=".7" />
        <circle cx="16" cy="16" r="4" fill="currentColor" fillOpacity=".35" />
        <circle cx="16" cy="16" r="1.5" fill="#efffba" />
        {/* Framing botanical leaves */}
        <path d="M6 16c2-4 6-5 10-3M26 16c-2-4-6-5-10-3" opacity=".8" />
      </>
    ),
  }[label];

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="forest-stat-icon"
    >
      {/* Living botanical hexagonal frame */}
      <path
        className="forest-icon-frame"
        d="M16 2 28 8v16l-12 6L4 24V8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity=".5"
      />
      {mark}
    </svg>
  );
}

export function ForestProgress({ progress, state, id }) {
  const isComplete = progress >= 99.95;
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <svg
      className={`forest-progress ${state}${isComplete ? ' complete' : ''}`}
      preserveAspectRatio="none"
      viewBox="0 0 200 20"
      aria-hidden="true"
    >
      <defs>
        {/* Gradient for the living sap vine */}
        <linearGradient id={`${id}-sap`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#225134" />
          <stop offset="40%" stopColor="#4a9355" />
          <stop offset="85%" stopColor="#8be39b" />
          <stop offset="100%" stopColor="#efffba" />
        </linearGradient>
        {/* Clip path for the progress reveal */}
        <clipPath id={`${id}-clip`}>
          <rect width={`${clamped * 2}`} height="20" rx="3" />
        </clipPath>
        {/* Repeating leaf vine pattern */}
        <pattern id={`${id}-leaves`} width="28" height="20" patternUnits="userSpaceOnUse">
          {/* Main vine stem */}
          <path d="M0 10 Q14 7 28 10" stroke="#a4eaaf" strokeWidth="1.5" fill="none" opacity=".85" />
          {/* Alternating sprouting leaves */}
          <path d="M7 9 C5 4 11 4 13 8 C10 10 8 10 7 9 Z" fill="#efffba" opacity=".9" />
          <path d="M21 11 C23 16 17 16 15 12 C18 10 20 10 21 11 Z" fill="#efffba" opacity=".9" />
          {/* Glowing sap nodes */}
          <circle cx="14" cy="9" r="1.2" fill="#efffba" />
        </pattern>
      </defs>

      {/* Progress fill */}
      <g clipPath={`url(#${id}-clip)`}>
        {/* Deep rich jade base fill */}
        <rect width="200" height="20" fill="url(#`${id}-sap`)" />
        {/* Leaf pattern overlay */}
        <rect width="200" height="20" fill={`url(#${id}-leaves)`} opacity=".75" />
      </g>

      {/* Glowing sprout cursor at the leading edge */}
      {clamped > 2 && clamped < 99.95 && (
        <g transform={`translate(${clamped * 2}, 10)`} className="forest-runner">
          <circle r="3" fill="#efffba" className="forest-bud-glow" />
          <path d="M0 0 C-3 -6 3 -6 0 0 Z" fill="#efffba" />
          <path d="M0 0 C-3 6 3 6 0 0 Z" fill="#efffba" />
        </g>
      )}

      {/* Complete bloom starburst */}
      {isComplete && (
        <g transform="translate(192, 10)" opacity=".95">
          <circle r="3.5" fill="#efffba" />
          <path d="M-6 0h12M0-6v12M-4-4l8 8M-4 4l8-8" stroke="#efffba" strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
}

function ForestFireflies() {
  const count = 18;
  return (
    <div className="forest-fireflies" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const left = 3 + (i * 19.3) % 94;
        const top = 12 + (i * 17.7) % 76;
        const size = 2 + (i % 3) * 1.5;
        const dur = 4 + (i % 5) * 1.8;
        const delay = -(i * 1.3);
        return (
          <span
            key={i}
            className="forest-firefly"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export function ForestMasthead() {
  return (
    <header className="forest-masthead" aria-label="Deluge Sylva: Ancient Redwood Canopy">
      <ForestFireflies />
      {/* Atmospheric layered redwood canopy silhouette with god rays */}
      <svg
        className="forest-canopy-art"
        viewBox="0 0 760 160"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="forest-mist" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#19342b" stopOpacity=".95" />
            <stop offset="50%" stopColor="#19342b" stopOpacity=".5" />
            <stop offset="100%" stopColor="#19342b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="forest-godray" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#efffba" stopOpacity=".22" />
            <stop offset="60%" stopColor="#76d48b" stopOpacity=".08" />
            <stop offset="100%" stopColor="#19342b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Volumetric god rays filtering through the canopy */}
        <polygon points="120,0 240,0 360,160 180,160" fill="url(#forest-godray)" />
        <polygon points="340,0 440,0 560,160 410,160" fill="url(#forest-godray)" />
        <polygon points="560,0 660,0 760,160 620,160" fill="url(#forest-godray)" />

        {/* Distant mountain ridges */}
        <path d="M0 135 Q180 85 380 125 T760 110 L760 160 L0 160 Z" fill="#132a22" opacity=".7" />

        {/* Midground ancient giant redwoods */}
        <path
          d="M80 160 L92 45 L98 45 L110 160ZM210 160 L222 25 L228 25 L240 160ZM540 160 L552 35 L558 35 L570 160ZM670 160 L680 50 L686 50 L696 160Z"
          fill="#1c3d31"
        />

        {/* Rich Redwood branches and pine needles */}
        <path
          d="M95 50 C60 55 40 70 20 85 M95 65 C130 68 150 82 170 95 M95 85 C65 92 45 105 30 120 M225 30 C190 38 170 52 145 68 M225 48 C265 52 290 68 315 82 M225 72 C185 80 165 98 140 115 M555 40 C520 48 495 62 470 78 M555 60 C595 64 625 78 650 92 M683 55 C650 62 630 76 605 92 M683 75 C720 80 740 95 760 110"
          stroke="#2d5746"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Foreground ferns and lush botanical moss layer */}
        <path
          d="M0 160 C30 145 50 142 80 160 C110 144 140 145 170 160 C210 140 250 142 290 160 C340 142 390 140 440 160 C490 144 530 142 570 160 C620 142 670 144 720 160 L760 160 L760 160 L0 160 Z"
          fill="#16362b"
        />

        {/* Ground mist overlay */}
        <rect y="90" width="760" height="70" fill="url(#forest-mist)" />
      </svg>

      <div className="forest-masthead-content">
        <div className="forest-masthead-title">
          <ForestMark className="forest-masthead-seal" />
          <div>
            <h1>DELUGE SYLVA</h1>
            <p>ANCIENT REDWOOD CANOPY · BIOLUMINESCENT OBSERVATORY</p>
          </div>
        </div>
        <div className="forest-telemetry-badge" aria-hidden="true">
          <span className="forest-status-dot" />
          <span>CANOPY TELEMETRY · 99.8% GROVE STABILITY</span>
        </div>
      </div>
    </header>
  );
}
