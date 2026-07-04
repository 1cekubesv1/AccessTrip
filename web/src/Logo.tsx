import React from 'react'
import { APP_NAME_PARTS } from './config'

// Brand mark: a flowing route with nodes (a journey orchestrated step by step),
// ending in a checkmark node. Pure SVG, theme-aware — colors come from the CSS
// accent variables so the mark follows whichever stylesheet is active.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" role="img">
      <defs>
        <linearGradient id="lg-route" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--st-reconfirmed)" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        fill="var(--bg-elevated)"
        stroke="var(--line)"
      />
      <path
        d="M8 22 C 8 14, 16 18, 16 12 S 24 8, 24 10"
        stroke="url(#lg-route)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="8" cy="22" r="2.6" fill="var(--brand)" />
      <circle cx="16" cy="15.5" r="2.2" fill="var(--brand-strong)" />
      <circle cx="24" cy="10" r="3.2" fill="var(--st-reconfirmed)" />
      <path
        d="M22.6 10 l1 1 l1.8 -2"
        stroke="var(--brand-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function Wordmark() {
  const [a, b] = APP_NAME_PARTS
  return (
    <span className="brand">
      <LogoMark />
      <span className="brand-text">
        {a}
        <span className="dot">{b}</span>
      </span>
    </span>
  )
}

export default Wordmark
