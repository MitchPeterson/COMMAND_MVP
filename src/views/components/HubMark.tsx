import React from 'react';

interface HubMarkProps {
  size?: number;
}

export function HubMark({ size = 22 }: HubMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" stroke="#C9A24D" strokeWidth="1.4" />
      <line x1="12" y1="12" x2="12" y2="2" stroke="#C9A24D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="19.1" y2="5" stroke="#C9A24D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="22" y2="12" stroke="#C9A24D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="19.1" y2="19" stroke="#C9A24D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="12" y2="22" stroke="#C9A24D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="4.9" y2="19" stroke="#C9A24D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="2" y2="12" stroke="#C9A24D" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="4.9" y2="5" stroke="#C9A24D" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="2" r="1.8" fill="#C9A24D" />
      <circle cx="19.1" cy="5" r="1.8" fill="#C9A24D" />
      <circle cx="22" cy="12" r="1.8" fill="#C9A24D" />
      <circle cx="19.1" cy="19" r="1.8" fill="#C9A24D" />
      <circle cx="12" cy="22" r="1.8" fill="#C9A24D" />
      <circle cx="4.9" cy="19" r="1.8" fill="#C9A24D" />
      <circle cx="2" cy="12" r="1.8" fill="#C9A24D" />
      <circle cx="4.9" cy="5" r="1.8" fill="#C9A24D" />
      <circle cx="12" cy="12" r="2.8" fill="#C9A24D" />
      <circle cx="12" cy="12" r="1.4" fill="#0F0F10" />
    </svg>
  );
}
