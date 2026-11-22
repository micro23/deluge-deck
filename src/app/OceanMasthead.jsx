import React from 'react';

// Unlabelled contour lines echo the seafloor around the habitat photograph.
function DepthContours() {
  return (
    <svg className="ocean-contours" viewBox="0 0 440 180" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="currentColor" strokeWidth=".85">
        <path d="M-25 41C35 23 62 55 94 37s43-45 85-38 48 38 86 29 54-55 106-32" />
        <path d="M-25 52C35 34 63 68 101 46s44-43 80-36 49 38 91 27 56-52 102-30" />
        <path d="M-25 63C35 44 63 82 108 55s45-42 76-32 51 36 95 25 54-46 99-27" />
        <path d="M-25 76C34 54 64 95 116 64s45-40 71-29 53 34 99 23 53-41 96-23" />
        <path d="M-25 91C31 66 65 107 123 74s45-39 68-26 57 32 102 22 53-36 92-20" />
        <path d="M-25 106C29 79 65 120 129 87s44-38 67-24 61 28 105 18 52-29 89-16" />
        <path d="M-25 123C28 95 67 133 136 101s45-37 67-21 62 23 107 15 52-23 86-10" />
        <path d="M-25 142C25 112 68 147 142 117s47-36 68-19 63 21 110 13 51-18 84-6" />
      </g>
    </svg>
  );
}

export function OceanMasthead() {
  return (
    <header className="core-masthead ocean-masthead" aria-labelledby="ocean-masthead-title">
      <DepthContours />
      <h1 id="ocean-masthead-title">Ocean</h1>
      <span className="ocean-frame" aria-hidden="true" />
    </header>
  );
}
