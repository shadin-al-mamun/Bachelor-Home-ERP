import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import i18n from 'i18next'
import { useTranslation } from 'react-i18next'

// Helper component that consumes translations to verify text toggles
const TranslationConsumer: React.FC = () => {
  const { t } = useTranslation()
  return (
    <div>
      <LanguageSwitcher />
      <span data-testid="dashboard-title">{t('nav.dashboard')}</span>
      <span data-testid="app-title">{t('app.title')}</span>
    </div>
  )
}

describe('LanguageSwitcher.test.tsx - Bilingual Language Toggle', () => {
  it('renders initial state showing বাংলা when language is Bengali', async () => {
    await i18n.changeLanguage('bn')
    render(<LanguageSwitcher />)

    const label = screen.getByTestId('language-label')
    expect(label).toHaveTextContent('বাংলা')
    expect(screen.getByTestId('globe-icon')).toBeInTheDocument()
  })

  it('toggles language from Bengali to English on click', async () => {
    await i18n.changeLanguage('bn')
    render(<TranslationConsumer />)

    // Initial Bengali check
    expect(screen.getByTestId('language-label')).toHaveTextContent('বাংলা')
    expect(screen.getByTestId('dashboard-title')).toHaveTextContent('ড্যাশবোর্ড')
    expect(screen.getByTestId('app-title')).toHaveTextContent('ব্যাচেলর হোম ইআরপি')

    // Click toggle button
    const button = screen.getByTestId('language-switcher')
    fireEvent.click(button)

    // Verify switched to English
    expect(i18n.language).toMatch(/^en/)
    expect(screen.getByTestId('language-label')).toHaveTextContent('EN')
    expect(screen.getByTestId('dashboard-title')).toHaveTextContent('Dashboard')
    expect(screen.getByTestId('app-title')).toHaveTextContent('Bachelor Home ERP')
  })

  it('toggles language back to Bengali from English on second click', async () => {
    await i18n.changeLanguage('en')
    render(<TranslationConsumer />)

    expect(screen.getByTestId('language-label')).toHaveTextContent('EN')
    expect(screen.getByTestId('dashboard-title')).toHaveTextContent('Dashboard')

    // Click toggle button
    const button = screen.getByTestId('language-switcher')
    fireEvent.click(button)

    // Verify switched back to Bengali
    expect(i18n.language).toMatch(/^bn/)
    expect(screen.getByTestId('language-label')).toHaveTextContent('বাংলা')
    expect(screen.getByTestId('dashboard-title')).toHaveTextContent('ড্যাশবোর্ড')
  })

  it('supports hiding the globe icon with showIcon={false}', () => {
    render(<LanguageSwitcher showIcon={false} />)
    expect(screen.queryByTestId('globe-icon')).not.toBeInTheDocument()
    expect(screen.getByTestId('language-label')).toBeInTheDocument()
  })
})
