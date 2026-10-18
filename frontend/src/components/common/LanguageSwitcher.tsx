import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export interface LanguageSwitcherProps {
  className?: string
  showIcon?: boolean
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  showIcon = true,
}) => {
  const { i18n } = useTranslation()

  const isBengali = i18n.language.startsWith('bn')

  const toggleLanguage = () => {
    const nextLang = isBengali ? 'en' : 'bn'
    i18n.changeLanguage(nextLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      data-testid="language-switcher"
      aria-label="Toggle language"
      title="Toggle Bengali / English"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors ${className}`}
    >
      {showIcon && <Globe className="w-3.5 h-3.5 text-primary-400" data-testid="globe-icon" />}
      <span data-testid="language-label">{isBengali ? 'বাংলা' : 'EN'}</span>
    </button>
  )
}

export default LanguageSwitcher
