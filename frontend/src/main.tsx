import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/print.css'
import './i18n'
import App from './App.tsx'

// Safe Service Worker registration for PWA with automatic activation
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Auto update service worker immediately when new build arrives
    updateSW(true)
  },
  onOfflineReady() {
    // App cached and ready for offline use
  },
})

// Check for service worker updates immediately and on visibility change
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready
    .then((reg) => reg.update())
    .catch(() => {})

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready
        .then((reg) => reg.update())
        .catch(() => {})
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

