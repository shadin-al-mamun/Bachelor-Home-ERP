import React from 'react'

interface DhakaPoliceLogoProps {
  className?: string
  size?: number
}

/**
 * High-definition Vector Emblem of Bangladesh Police / Dhaka Metropolitan Police
 */
export const DhakaPoliceLogo: React.FC<DhakaPoliceLogoProps> = ({
  className = 'w-16 h-16',
  size = 64,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Gold Facet Gradients */}
        <linearGradient id="goldLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#E5A910" />
          <stop offset="100%" stopColor="#9C6B00" />
        </linearGradient>
        <linearGradient id="goldDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C48805" />
          <stop offset="100%" stopColor="#7A5200" />
        </linearGradient>
        <radialGradient id="greenBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#057A44" />
          <stop offset="85%" stopColor="#004D25" />
          <stop offset="100%" stopColor="#003318" />
        </radialGradient>
        <radialGradient id="redBadge" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#FF384D" />
          <stop offset="70%" stopColor="#D90429" />
          <stop offset="100%" stopColor="#8D0801" />
        </radialGradient>
      </defs>

      {/* 8-Point Faceted Police Star (outer crest) */}
      <g id="star-points">
        {/* N */}
        <path d="M 50,5 L 56,32 L 50,28 Z" fill="url(#goldLight)" />
        <path d="M 50,5 L 44,32 L 50,28 Z" fill="url(#goldDark)" />
        {/* NE */}
        <path d="M 82,18 L 68,38 L 66,33 Z" fill="url(#goldLight)" />
        <path d="M 82,18 L 61,44 L 66,33 Z" fill="url(#goldDark)" />
        {/* E */}
        <path d="M 95,50 L 68,56 L 72,50 Z" fill="url(#goldLight)" />
        <path d="M 95,50 L 68,44 L 72,50 Z" fill="url(#goldDark)" />
        {/* SE */}
        <path d="M 82,82 L 61,56 L 66,67 Z" fill="url(#goldLight)" />
        <path d="M 82,82 L 68,62 L 66,67 Z" fill="url(#goldDark)" />
        {/* S */}
        <path d="M 50,95 L 44,68 L 50,72 Z" fill="url(#goldLight)" />
        <path d="M 50,95 L 56,68 L 50,72 Z" fill="url(#goldDark)" />
        {/* SW */}
        <path d="M 18,82 L 32,62 L 34,67 Z" fill="url(#goldLight)" />
        <path d="M 18,82 L 39,56 L 34,67 Z" fill="url(#goldDark)" />
        {/* W */}
        <path d="M 5,50 L 32,44 L 28,50 Z" fill="url(#goldLight)" />
        <path d="M 5,50 L 32,56 L 28,50 Z" fill="url(#goldDark)" />
        {/* NW */}
        <path d="M 18,18 L 39,44 L 34,33 Z" fill="url(#goldLight)" />
        <path d="M 18,18 L 32,38 L 34,33 Z" fill="url(#goldDark)" />
      </g>

      {/* Concentric Golden Outer Ring */}
      <circle cx="50" cy="50" r="33" fill="none" stroke="url(#goldLight)" strokeWidth="3" />

      {/* Emerald Green Circular Shield Body */}
      <circle cx="50" cy="50" r="30" fill="url(#greenBg)" stroke="#FFD700" strokeWidth="1.2" />

      {/* Inner Gold Beaded Border */}
      <circle cx="50" cy="50" r="26" fill="none" stroke="#FFD700" strokeWidth="1" strokeDasharray="1.5,1.5" />

      {/* Central Red Shield / Star Badge */}
      <path
        d="M 50,26 L 56,38 L 70,39 L 59,48 L 63,62 L 50,54 L 37,62 L 41,48 L 30,39 L 44,38 Z"
        fill="url(#redBadge)"
        stroke="#FFF"
        strokeWidth="1"
      />

      {/* Golden National Water Lily (শাপলা) Emblem in Center */}
      <g transform="translate(0, -1)">
        {/* Center Petal */}
        <path d="M 50,37 C 47,43 47,49 50,51 C 53,49 53,43 50,37 Z" fill="#FFED4A" />
        {/* Left Petal */}
        <path d="M 50,45 C 44,42 42,47 45,51 C 47,51 49,49 50,45 Z" fill="#FCD34D" />
        {/* Right Petal */}
        <path d="M 50,45 C 56,42 58,47 55,51 C 53,51 51,49 50,45 Z" fill="#FCD34D" />
        {/* Water Ripple Base */}
        <path d="M 43,53 Q 50,55 57,53 Q 50,57 43,53 Z" fill="#FEF08A" />
      </g>

      {/* Laurel Wreath Sheaf (ধানের শীষ) along sides */}
      <path
        d="M 28,52 C 28,66 38,72 50,74 C 62,72 72,66 72,52"
        fill="none"
        stroke="#FDE047"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Bottom Police Ribbon/Banner */}
      <path
        d="M 32,74 Q 50,71 68,74 L 64,80 Q 50,76 36,80 Z"
        fill="#C53030"
        stroke="#FFD700"
        strokeWidth="0.8"
      />
    </svg>
  )
}

export default DhakaPoliceLogo
