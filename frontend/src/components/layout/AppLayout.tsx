import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import OperationalAlertBanner from './OperationalAlertBanner'
import OfflineWarningToast from '../common/OfflineWarningToast'

export const AppLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      {/* Responsive Desktop & Drawer Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        <Header onToggleSidebar={() => setIsMobileMenuOpen(true)} />

        {/* Dynamic Outlet with bottom padding on mobile for MobileNav */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-7xl w-full mx-auto">
          {/* Real-Time Operational Alert Banners */}
          <OperationalAlertBanner />

          <Outlet />
        </main>

        {/* Bottom Mobile Navigation */}
        <MobileNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* PWA Offline Safety Trap Notification Toast */}
        <OfflineWarningToast />
      </div>
    </div>
  )
}

export default AppLayout
