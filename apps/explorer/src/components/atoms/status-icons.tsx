import React from 'react';

// The status glyphs of explorer's boxes, beside their word: one definition
// each for the box error notice and the editor's marker badges.

const glyph = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  'aria-hidden': true,
} as const;

/** A crossed circle, the error cue. */
export function ErrorIcon() {
  return (
    <svg {...glyph}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

/** A triangle with an exclamation mark, the warning cue. */
export function WarningIcon() {
  return (
    <svg {...glyph} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r=".5" />
    </svg>
  );
}
