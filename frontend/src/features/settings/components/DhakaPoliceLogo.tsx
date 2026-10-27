import React from 'react'
import { DMP_LOGO_BASE64 } from './dmpLogoBase64'

interface DhakaPoliceLogoProps {
  className?: string
  size?: number
}

/**
 * Official Dhaka Metropolitan Police (DMP) Crest Emblem
 * Exact replica of Bangladesh Dhaka Metropolitan Police insignia
 */
export const DhakaPoliceLogo: React.FC<DhakaPoliceLogoProps> = ({
  className = 'w-14 h-14',
  size = 56,
}) => {
  return (
    <img
      src={DMP_LOGO_BASE64}
      alt="ঢাকা মেট্রোপলিটন পুলিশ"
      width={size}
      height={Math.round(size * 0.906)}
      className={`inline-block object-contain select-none ${className}`}
      style={{
        width: `${size}px`,
        height: 'auto',
        maxHeight: `${size}px`,
      }}
    />
  )
}

export default DhakaPoliceLogo
