// The logo, in the version that suits what is behind it.
//
// Command_Logo.png carries an opaque near-black background, which is right on
// the app's own surfaces and wrong on the printed report — where it landed as a
// black rectangle in the corner of a white page.
//
// The light artwork lives at /Command_Logo_Light.png. Until that file exists the
// dark one is used instead, so a missing asset degrades to the old appearance
// rather than a broken image.

import React, { useState } from 'react';

const DARK = '/Command_Logo.png';
const LIGHT = '/Command_Logo_Light.png';

interface Props {
  /** The background it sits on, not the color of the artwork. */
  tone?: 'dark' | 'light';
  className?: string;
}

export function Logo({ tone = 'dark', className }: Props) {
  const [src, setSrc] = useState(tone === 'light' ? LIGHT : DARK);

  return (
    <img
      src={src}
      alt="Command"
      className={className}
      // Falls back once, and only from the light variant.
      onError={() => { if (src !== DARK) setSrc(DARK); }}
    />
  );
}
