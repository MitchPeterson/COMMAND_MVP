// The logo, in the version that suits what is behind it.
//
// The asset this replaced carried an opaque near-black background — the black
// rectangle that showed up on the printed report, and the reason the mark never
// looked like it belonged to the surface under it. Both assets here have
// transparent backgrounds, so the logo sits on a surface rather than on top of
// a page of its own.
//
// All three are generated from brand/Command_Logo_Master.png: the page is
// knocked out, the gold is kept at the strength the artwork draws it, and the
// neutral wordmark is recolored for the surface. Replacing the artwork means
// replacing that one file and regenerating.

import React, { useEffect, useState } from 'react';

/** Gold mark, off-white wordmark. For Command Black and charcoal. */
const ON_DARK = '/Command_Logo_OnDark.png';
/** Gold mark, near-black wordmark. For the printed report. */
const ON_LIGHT = '/Command_Logo_Light.png';

interface Props {
  /** The background it sits on, not the color of the artwork. */
  tone?: 'dark' | 'light';
  className?: string;
}

export function Logo({ tone, className }: Props) {
  // With no tone given, follow the page. The light preview turned the sidebar
  // white and left an off-white wordmark on it, which is nearly invisible.
  const [pageIsLight, setPageIsLight] = useState(false);
  useEffect(() => {
    const read = () => setPageIsLight(document.documentElement.classList.contains('theme-light'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const light = tone ? tone === 'light' : pageIsLight;

  return (
    <img
      src={light ? ON_LIGHT : ON_DARK}
      alt="Command"
      className={className}
    />
  );
}
