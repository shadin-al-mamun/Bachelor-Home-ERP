import '@testing-library/jest-dom/vitest'
import React from 'react'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import bn from '@/i18n/locales/bn.json'
import en from '@/i18n/locales/en.json'

// Initialize i18next for testing environment
i18n.use(initReactI18next).init({
  lng: 'bn',
  fallbackLng: 'bn',
  resources: {
    bn: { translation: bn },
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false,
  },
})

// Auto-cleanup DOM after each test
afterEach(() => {
  cleanup()
})

// Window Mock Polyfills for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// ResizeObserver mock
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = () => {}
  window.HTMLElement.prototype.hasPointerCapture = () => false
  window.HTMLElement.prototype.setPointerCapture = () => {}
  window.HTMLElement.prototype.releasePointerCapture = () => {}
}

// Mock @radix-ui/react-dialog for reliable jsdom rendering
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open }: any) => (open ? React.createElement('div', { 'data-testid': 'radix-dialog-root' }, children) : null),
  Trigger: ({ children }: any) => children,
  Portal: ({ children }: any) => children,
  Overlay: ({ children }: any) => children,
  Content: ({ children, className }: any) => React.createElement('div', { className, 'data-testid': 'radix-dialog-content' }, children),
  Title: ({ children, className }: any) => React.createElement('h2', { className }, children),
  Description: ({ children, className }: any) => React.createElement('p', { className }, children),
  Close: ({ children }: any) => children,
}))
