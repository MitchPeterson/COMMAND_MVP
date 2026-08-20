// The logo, in the version that suits what is behind it.
//
// The original asset carries an opaque near-black background. That is the black
// rectangle that shows up on the printed report, and the reason the mark never
// looks like it belongs to the surface it sits on — a logo with its own
// background sits on top of a page rather than on it.
//
// Two assets replace it, both with transparent backgrounds:
//
//   Command_Logo_Light.png   gold mark, near-black wordmark — for white
//   Command_Logo_OnDark.png  gold mark, off-white wordmark — for the app
//
// The second is derived from the first by knocking out the page and recoloring
// the wordmark, so only one piece of artwork is ever maintained.
//
// Until an asset exists the original is used instead, so a missing file
// degrades to the previous appearance rather than a broken image.

import React, { useState } from 'react';

const ORIGINAL = '/Command_Logo.png';
const ON_DARK = '/Command_Logo_OnDark.png';
const ON_LIGHT = '/Command_Logo_Light.png';

interface Props {
  /** The background it sits on, not the color of the artwork. */
  tone?: 'dark' | 'light';
  className?: string;
}

export function Logo({ tone = 'dark', className }: Props) {
  const [src, setSrc] = useState(tone === 'light' ? ON_LIGHT : ON_DARK);

  return (
    <img
      src={src}
      alt="Command"
      className={className}
      // One step back, to the asset that has always been there.
      onError={() => { if (src !== ORIGINAL) setSrc(ORIGINAL); }}
    />
  );
}
