import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/app/store/useAuthStore'
import i18n from 'i18next'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const renderSidebar = (initialRoute = '/dashboard') => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Sidebar isCollapsed={false} onToggleCollapse={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Sidebar.test.tsx - Hierarchical Navigation & Submenu System', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('bn')
    useAuthStore.getState().setDemoUser('SUPER_ADMIN')
  })

  it('renders core top-level items and grouped submenu headers', () => {
    renderSidebar()

    // Core top-level items
    expect(screen.getByText('ড্যাশবোর্ড')).toBeInTheDocument()
    expect(screen.getByText('আবাসন ও সিট')).toBeInTheDocument()
    expect(screen.getByText('আবাসিক বোর্ডার তালিকা')).toBeInTheDocument()

    // Grouped Submenu headers
    expect(screen.getByText('মিল ব্যবস্থাপনা')).toBeInTheDocument()
    expect(screen.getByText('বিলিং ও ফাইনান্স')).toBeInTheDocument()
    expect(screen.getByText('সিস্টেম সেটিংস')).toBeInTheDocument()
  })

  it('displays sub-items for মিল ব্যবস্থাপনা and allows toggling', () => {
    renderSidebar()

    // Child items of Meal Management
    expect(screen.getByText('খাবার ইঞ্জিন (কিচেন)')).toBeInTheDocument()
    expect(screen.getByText('মিল রেট ও বিলিং সেটিংস')).toBeInTheDocument()

    // Clicking group header collapses the submenu
    const mealGroupBtn = screen.getByText('মিল ব্যবস্থাপনা').closest('button')!
    fireEvent.click(mealGroupBtn)
    expect(screen.queryByText('খাবার ইঞ্জিন (কিচেন)')).not.toBeInTheDocument()

    // Clicking again re-opens it
    fireEvent.click(mealGroupBtn)
    expect(screen.getByText('খাবার ইঞ্জিন (কিচেন)')).toBeInTheDocument()
  })

  it('displays all financial sub-items under বিলিং ও ফাইনান্স including মাসিক বিল জেনারেট', () => {
    renderSidebar()

    // Child items of Billing & Finance
    expect(screen.getByText('১. বিল আদায়')).toBeInTheDocument()
    expect(screen.getByText('মাসিক বিল জেনারেট')).toBeInTheDocument()
    expect(screen.getByText('২. খরচ (Expenses)')).toBeInTheDocument()
    expect(screen.getByText('৩. অ্যাকাউন্ট (Accounts)')).toBeInTheDocument()
    expect(screen.getByText('৪. টাকা ট্রান্সফার')).toBeInTheDocument()
    expect(screen.getByText('৫. রিপোর্ট (Reports)')).toBeInTheDocument()
  })

  it('opens সিস্টেম সেটিংস and displays settings sub-items', () => {
    renderSidebar()

    // Sub-items should already be visible by default
    expect(screen.getByText('কর্মকর্তা ও পদবী ব্যবস্থাপনা')).toBeInTheDocument()
    expect(screen.getByText('হোস্টেল সেটিংস')).toBeInTheDocument()
    expect(screen.getByText('নোটিশ ও ঘোষণা')).toBeInTheDocument()
    expect(screen.getByText('মেনু ও একসেস কন্ট্রোল ব্যবস্থাপনা')).toBeInTheDocument()
    expect(screen.getByText('সিস্টেম অডিট ট্রেইল')).toBeInTheDocument()

    // Clicking group header collapses the submenu
    const settingsGroupBtn = screen.getByText('সিস্টেম সেটিংস').closest('button')!
    fireEvent.click(settingsGroupBtn)
    expect(screen.queryByText('হোস্টেল সেটিংস')).not.toBeInTheDocument()

    // Clicking again re-opens it
    fireEvent.click(settingsGroupBtn)
    expect(screen.getByText('হোস্টেল সেটিংস')).toBeInTheDocument()
    expect(screen.getByText('নোটিশ ও ঘোষণা')).toBeInTheDocument()
  })

  it('automatically expands group when current route matches a child link', () => {
    // Navigate directly to /reports
    renderSidebar('/reports')

    // Billing & Finance group should have child visible
    expect(screen.getByText('৫. রিপোর্ট (Reports)')).toBeInTheDocument()
  })
})
