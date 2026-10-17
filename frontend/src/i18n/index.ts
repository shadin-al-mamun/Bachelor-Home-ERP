import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import bn from './locales/bn.json'

const resources = {
  bn: { translation: bn },
  en: { translation: en },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'bn',
    lng: localStorage.getItem('i18nextLng') || 'bn',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

// Dynamically sync HTML document lang and font classes
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  if (lng === 'bn') {
    document.body.classList.add('font-bengali')
    document.body.classList.remove('font-sans')
  } else {
    document.body.classList.add('font-sans')
    document.body.classList.remove('font-bengali')
  }
})

export default i18n
