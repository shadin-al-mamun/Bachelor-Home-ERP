import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/print.css'
import './i18n'
import App from './App.tsx'

// Safe Service Worker registration for PWA
registerSW({
  immediate: true,
  onNeedRefresh() {
    // New version ready; activates seamlessly without forced page disruption
  },
  onOfflineReady() {
    // App cached and ready for offline use
  },
})

// Check for service worker updates in background without forcefully interrupting active forms
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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

