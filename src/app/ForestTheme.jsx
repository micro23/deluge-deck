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
        <radialGradient id="forest-mark-glow" cx="50%" cy="40%" r="55%">
          <stop stopColor="#efffba" stopOpacity=".9" />
          <stop offset="50%" stopColor="#76d48b" stopOpacity=".4" />
          <stop offset="100%" stopColor="#10251f" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer botanical ring */}
      <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="1.2" opacity=".35" strokeDasharray="3 3" />
      <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="1.5" opacity=".7" />
      <circle cx="22" cy="18" r="13" fill="url(#forest-mark-glow)" opacity=".45" />

      {/* Ancient Tree: Trunk & Deep Spread Roots */}
      <path
        d="M22 37v-16M19 37c1-3 3-5 3-9M25 37c-1-3-3-5-3-9M15 39c3-1 6-4 7-8M29 39c-3-1-6-4-7-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Majestic tiered pine canopy */}
      {/* Top crown */}
      <polygon
        points="22,5 16,13 28,13"
        fill="currentColor"
        fillOpacity=".6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Mid tier */}
      <polygon
        points="22,10 13,20 31,20"
        fill="currentColor"
        fillOpacity=".45"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Bottom tier */}
      <polygon
        points="22,16 10,27 34,27"
        fill="currentColor"
        fillOpacity=".35"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Needle details */}
      <path
        d="M22 7v19M18 12l4-3 4 3M15 18l7-4 7 4M12 25l10-5 10 5"
        stroke="#efffba"
        strokeWidth="0.8"
        opacity=".7"
      />

      {/* Glowing spore at apex */}
      <circle cx="22" cy="5" r="1.5" fill="#efffba" />
    </svg>
  );
}

export function ForestIdentity({ compact = false }) {
  return (
    <div
      className={`forest-identity${compact ? ' compact' : ''}`}
      aria-label="Forest theme"
    >
      <ForestMark />
    </div>
  );
}

export function ForestStatIcon({ label }) {
  const mark = {
    // Download: Clean downward arrow with elegant twin seedling leaves
    Download: (
      <>
        <path d="M16 6v14m-5-5 5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9C12 6 10 9 16 11M16 9C20 6 22 9 16 11" fill="currentColor" fillOpacity=".35" />
        <circle cx="16" cy="24" r="1.5" fill="#efffba" />
      </>
    ),
    // Upload: Clean upward arrow with tiered pine boughs
    Upload: (
      <>
        <path d="M16 26V8m-5 5 5-5 5 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="16,5 12,10 20,10" fill="currentColor" fillOpacity=".4" />
        <circle cx="16" cy="5" r="1.2" fill="#efffba" />
      </>
    ),
    // Connections: Root & node network
    Connections: (
      <>
        <circle cx="16" cy="16" r="3.5" fill="currentColor" fillOpacity=".3" strokeWidth="1.6" />
        <circle cx="8" cy="10" r="2" fill="currentColor" />
        <circle cx="24" cy="10" r="2" fill="currentColor" />
        <circle cx="8" cy="22" r="2" fill="currentColor" />
        <circle cx="24" cy="22" r="2" fill="currentColor" />
        <path d="M16 12.5V6M16 19.5v6M13 14 9.5 11M19 14l3.5-3M13 18l-3.5 3M19 18l3.5 3" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
        <circle cx="16" cy="16" r="1.2" fill="#efffba" />
      </>
    ),
    // Library: Concentric tree growth rings
    Library: (
      <>
        <circle cx="16" cy="16" r="12" strokeDasharray="3 3" opacity=".5" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="8" strokeWidth="1.4" opacity=".7" />
        <circle cx="16" cy="16" r="4" fill="currentColor" fillOpacity=".4" />
        <circle cx="16" cy="16" r="1.5" fill="#efffba" />
      </>
    ),
  }[label];

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="forest-stat-icon"
    >
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
        {/* Gradient for the living pine sap meter */}
        <linearGradient id={`${id}-sap`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1b4930" />
          <stop offset="45%" stopColor="#377d50" />
          <stop offset="85%" stopColor="#76d48b" />
          <stop offset="100%" stopColor="#efffba" />
        </linearGradient>
        {/* Clip path for the progress reveal */}
        <clipPath id={`${id}-clip`}>
          <rect width={`${clamped * 2}`} height="20" rx="3" />
        </clipPath>
        {/* Repeating pine needles and leaf pattern */}
        <pattern id={`${id}-leaves`} width="24" height="20" patternUnits="userSpaceOnUse">
          {/* Pine branch stem */}
          <path d="M0 10 Q12 8 24 10" stroke="#a4eaaf" strokeWidth="1.4" fill="none" opacity=".8" />
          {/* Sprouting pine needles */}
          <path d="M4 10 L8 5 M8 10 L12 4 M12 10 L16 5 M16 10 L20 4" stroke="#efffba" strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
          <path d="M4 10 L8 15 M8 10 L12 16 M12 10 L16 15 M16 10 L20 16" stroke="#efffba" strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
          {/* Glowing sap node */}
          <circle cx="12" cy="10" r="1.2" fill="#efffba" />
        </pattern>
      </defs>

      {/* Progress fill */}
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="200" height="20" fill={`url(#${id}-sap)`} />
        <rect width="200" height="20" fill={`url(#${id}-leaves)`} opacity=".7" />
      </g>

      {/* Sprout runner at the leading edge */}
      {clamped > 2 && clamped < 99.95 && (
        <g transform={`translate(${clamped * 2}, 10)`} className="forest-runner">
          <circle r="3" fill="#efffba" className="forest-bud-glow" />
          <path d="M0 0 L-4 -5 L0 -2 L4 -5 Z" fill="#efffba" />
          <path d="M0 0 L-4 5 L0 2 L4 5 Z" fill="#efffba" />
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
  const count = 16;
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

/* Individual evergreen pine tree component helper for the masthead */
function PineTree({ x, y, h, w, fill = '#1a3c2f', opacity = 1 }) {
  const t1 = y;
  const t2 = y + h * 0.35;
  const t3 = y + h * 0.65;
  const b = y + h;
  const hw = w / 2;
  return (
    <g opacity={opacity}>
      {/* Trunk */}
      <rect x={x - w * 0.08} y={b - h * 0.15} width={w * 0.16} height={h * 0.15} fill="#13271e" />
      {/* Tier 3 (bottom) */}
      <polygon points={`${x},${t2} ${x - hw},${b} ${x + hw},${b}`} fill={fill} />
      {/* Tier 2 (mid) */}
      <polygon points={`${x},${t1 + h * 0.18} ${x - hw * 0.8},${t3} ${x + hw * 0.8},${t3}`} fill={fill} />
      {/* Tier 1 (top) */}
      <polygon points={`${x},${t1} ${x - hw * 0.6},${t2} ${x + hw * 0.6},${t2}`} fill={fill} />
    </g>
  );
}

export function ForestMasthead() {
  return (
    <header className="forest-masthead" aria-label="Forest theme artwork">
      <ForestFireflies />
      {/* Cinematic panoramic forest landscape filled with dense pine, fir, and redwood trees */}
      <svg
        className="forest-canopy-art"
        viewBox="0 0 1000 160"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="forest-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c1f19" />
            <stop offset="50%" stopColor="#142e25" />
            <stop offset="100%" stopColor="#1a3a30" />
          </linearGradient>
          <linearGradient id="forest-fog" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#10251f" stopOpacity=".95" />
            <stop offset="45%" stopColor="#10251f" stopOpacity=".45" />
            <stop offset="100%" stopColor="#10251f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="forest-light-ray" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#efffba" stopOpacity=".18" />
            <stop offset="65%" stopColor="#76d48b" stopOpacity=".06" />
            <stop offset="100%" stopColor="#10251f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sky background */}
        <rect width="1000" height="160" fill="url(#forest-sky)" />

        {/* Diagonal morning light rays streaming through the canopy */}
        <polygon points="120,0 260,0 390,160 210,160" fill="url(#forest-light-ray)" />
        <polygon points="380,0 500,0 640,160 480,160" fill="url(#forest-light-ray)" />
        <polygon points="680,0 800,0 950,160 790,160" fill="url(#forest-light-ray)" />

        {/* LAYER 1: Distant misty mountain ridges with serrated treeline */}
        <path
          d="M0 85 Q160 55 350 78 T720 62 Q860 72 1000 55 L1000 160 L0 160 Z"
          fill="#0e231c"
          opacity=".7"
        />
        {/* Jagged distant pine crowns along the ridge */}
        <path
          d="M0 85 L8 78 L14 84 L22 75 L30 83 L38 72 L45 81 L55 70 L65 80 L75 68 L85 78 L98 65 L110 77 L122 62 L135 75 L150 60 L165 74 L180 58 L195 72 L210 56 L225 70 L240 54 L255 68 L270 52 L285 66 L300 55 L315 68 L330 58 L350 78 L370 65 L390 76 L410 62 L430 74 L450 58 L470 72 L490 56 L510 70 L530 54 L550 68 L570 52 L590 66 L610 50 L630 64 L650 48 L670 62 L690 46 L710 60 L730 48 L750 62 L770 50 L790 64 L810 52 L830 66 L850 54 L870 68 L890 56 L910 70 L930 58 L950 72 L970 60 L990 74 L1000 68 L1000 160 L0 160 Z"
          fill="#112921"
          opacity=".85"
        />

        {/* LAYER 2: Midground dense stand of evergreen pine and fir trees */}
        {/* Left side trees */}
        <PineTree x={30} y={45} h={105} w={38} fill="#143126" opacity=".9" />
        <PineTree x={65} y={35} h={118} w={42} fill="#16382c" opacity=".95" />
        <PineTree x={105} y={50} h={100} w={35} fill="#132f25" opacity=".9" />
        <PineTree x={145} y={40} h={112} w={40} fill="#173a2e" />
        <PineTree x={185} y={55} h={95} w={34} fill="#143227" opacity=".9" />

        {/* Center-left trees */}
        <PineTree x={235} y={30} h={122} w={44} fill="#193e31" />
        <PineTree x={280} y={48} h={102} w={36} fill="#15352a" opacity=".9" />
        <PineTree x={320} y={38} h={114} w={40} fill="#183d30" />
        <PineTree x={365} y={52} h={98} w={35} fill="#143328" opacity=".92" />
        <PineTree x={410} y={32} h={120} w={42} fill="#1a4134" />

        {/* Center-right trees */}
        <PineTree x={460} y={46} h={106} w={38} fill="#16372c" />
        <PineTree x={505} y={34} h={118} w={42} fill="#1a4033" />
        <PineTree x={550} y={50} h={100} w={36} fill="#143429" opacity=".9" />
        <PineTree x={595} y={36} h={116} w={40} fill="#183e31" />
        <PineTree x={640} y={48} h={104} w={37} fill="#15362b" />

        {/* Right side trees */}
        <PineTree x={690} y={28} h={124} w={44} fill="#1b4336" />
        <PineTree x={735} y={44} h={108} w={38} fill="#17392e" />
        <PineTree x={780} y={32} h={120} w={42} fill="#193f32" />
        <PineTree x={825} y={52} h={98} w={35} fill="#143328" opacity=".9" />
        <PineTree x={870} y={38} h={114} w={40} fill="#183d30" />
        <PineTree x={915} y={46} h={106} w={38} fill="#16382d" />
        <PineTree x={960} y={30} h={122} w={44} fill="#1a4134" />

        {/* LAYER 3: Foreground giant redwoods & ancient pine grove */}
        {/* Giant Redwood Trunk Left (x=160) */}
        <path d="M148 160 L158 10 L166 10 L176 160 Z" fill="#1c3e32" />
        <path d="M152 160 L160 10 M164 10 L172 160" stroke="#122820" strokeWidth="1.2" opacity=".6" />
        {/* Redwood branches & cascading needle foliage */}
        <path
          d="M162 18 C125 24 95 38 70 56 M162 18 C195 24 225 38 250 56 M162 38 C115 46 80 66 50 88 M162 38 C205 46 240 66 270 88 M162 60 C120 70 85 92 60 115 M162 60 C200 70 235 92 260 115 M162 85 C130 96 100 116 80 135 M162 85 C190 96 220 116 240 135"
          stroke="#275945"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M162 18 C125 24 95 38 70 56 M162 18 C195 24 225 38 250 56 M162 38 C115 46 80 66 50 88 M162 38 C205 46 240 66 270 88 M162 60 C120 70 85 92 60 115 M162 60 C200 70 235 92 260 115"
          stroke="#3d7d63"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity=".75"
        />

        {/* Giant Redwood Trunk Center (x=530) */}
        <path d="M516 160 L527 5 L535 5 L546 160 Z" fill="#1e4336" />
        <path d="M522 160 L530 5 M533 5 L541 160" stroke="#122820" strokeWidth="1.2" opacity=".6" />
        {/* Branches */}
        <path
          d="M531 15 C490 20 455 35 425 54 M531 15 C570 20 605 35 635 54 M531 35 C480 44 440 64 405 85 M531 35 C580 44 620 64 655 85 M531 58 C485 68 445 90 415 112 M531 58 C575 68 615 90 645 112 M531 82 C495 92 460 112 435 130 M531 82 C565 92 600 112 625 130"
          stroke="#2c624d"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M531 15 C490 20 455 35 425 54 M531 15 C570 20 605 35 635 54 M531 35 C480 44 440 64 405 85 M531 35 C580 44 620 64 655 85"
          stroke="#42876b"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity=".75"
        />

        {/* Giant Redwood Trunk Right (x=840) */}
        <path d="M828 160 L838 12 L844 12 L854 160 Z" fill="#1d4034" />
        <path d="M832 160 L840 12 M842 12 L850 160" stroke="#122820" strokeWidth="1.2" opacity=".6" />
        {/* Branches */}
        <path
          d="M841 22 C805 28 775 42 750 60 M841 22 C875 28 905 42 930 60 M841 45 C795 54 760 74 730 95 M841 45 C885 54 920 74 950 95 M841 70 C800 80 765 102 740 122 M841 70 C880 80 915 102 940 122"
          stroke="#295d48"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* LAYER 4: Lush forest floor ferns, saplings, and botanical understory */}
        <path
          d="M0 160 C35 142 65 140 100 160 C140 138 180 140 220 160 C270 136 320 135 370 160 C420 138 470 136 520 160 C570 135 620 136 670 160 C720 138 770 136 820 160 C870 135 920 138 970 160 L1000 160 L1000 160 L0 160 Z"
          fill="#16382d"
        />
        {/* Foreground fern clusters */}
        <path
          d="M10 160 C20 148 35 144 48 160 M25 160 C32 150 42 148 55 160 M180 160 C192 146 208 142 225 160 M330 160 C345 145 365 142 385 160 M490 160 C505 144 525 142 545 160 M640 160 C655 146 675 142 695 160 M800 160 C815 145 835 140 855 160 M930 160 C945 148 962 144 980 160"
          stroke="#55997b"
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".7"
        />

        {/* Floating ground mist gradient overlay */}
        <rect y="70" width="1000" height="90" fill="url(#forest-fog)" />
      </svg>
    </header>
  );
}
