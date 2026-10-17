import React from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building,
  Users,
  CreditCard,
  Wallet,
  UtensilsCrossed,
  FileBarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CalendarCheck,
  Receipt,
  DollarSign,
  ArrowRightLeft,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { cn } from '@/utils/cn'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

interface NavItem {
  titleKey: string
  defaultTitle: string
  href: string
  icon: React.ReactNode
  roles: string[]
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const userRole = profile?.role || 'SUPER_ADMIN'

  // Master Navigation Items
  const navItems: NavItem[] = [
    {
      titleKey: 'nav.dashboard',
      defaultTitle: 'ড্যাশবোর্ড',
      href: userRole === 'BOARDER' ? '/portal/dashboard' : '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR', 'BOARDER'],
    },
    {
      titleKey: 'nav.accommodations',
      defaultTitle: 'আবাসন ও সিট',
      href: '/accommodation',
      icon: <Building className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
    },
    {
      titleKey: 'nav.boarders',
      defaultTitle: 'বর্ডার তালিকা',
      href: '/boarders',
      icon: <Users className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
    },
    {
      titleKey: 'nav.billing',
      defaultTitle: 'বিলিং ও আদায়',
      href: '/billing',
      icon: <CreditCard className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
    },
    {
      titleKey: 'nav.expenses',
      defaultTitle: 'দৈনিক খরচ ও ভাউচার',
      href: '/expenses',
      icon: <Receipt className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
    },
    {
      titleKey: 'nav.incomes',
      defaultTitle: 'অন্যান্য আয়',
      href: '/finance/income',
      icon: <DollarSign className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
    },
    {
      titleKey: 'nav.transfers',
      defaultTitle: 'একাউন্ট স্থানান্তর',
      href: '/finance/transfers',
      icon: <ArrowRightLeft className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
    },
    {
      titleKey: 'nav.cashbook',
      defaultTitle: 'ম্যানেজার ক্যাশবুক',
      href: '/cash-custody',
      icon: <Wallet className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
    },
    {
      titleKey: 'nav.meals',
      defaultTitle: 'খাবার ইঞ্জিন',
      href: '/meals',
      icon: <UtensilsCrossed className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEAL_OPERATOR', 'AUDITOR'],
    },
    // Boarder specific nav items
    {
      titleKey: 'portal.myMeals',
      defaultTitle: 'আমার মিল নির্বাচন',
      href: '/portal/my-meals',
      icon: <CalendarCheck className="w-5 h-5 shrink-0" />,
      roles: ['BOARDER'],
    },
    {
      titleKey: 'portal.myDues',
      defaultTitle: 'আমার বকেয়া ও রশিদ',
      href: '/portal/my-dues',
      icon: <Receipt className="w-5 h-5 shrink-0" />,
      roles: ['BOARDER'],
    },
    {
      titleKey: 'nav.reports',
      defaultTitle: 'রিপোর্ট ও স্টেটমেন্ট',
      href: '/reports',
      icon: <FileBarChart2 className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
    },
    {
      titleKey: 'nav.settings',
      defaultTitle: 'সিস্টেম সেটিংস',
      href: '/settings',
      icon: <Settings className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
  ]

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen transition-all duration-300 flex flex-col',
          'bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                ERP Navigation
              </span>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mx-auto"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {filteredItems.map((item) => {
            const label = t(item.titleKey) !== item.titleKey ? t(item.titleKey) : item.defaultTitle

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group select-none',
                    isActive
                      ? 'bg-primary-600/20 text-white border border-primary-500/40 shadow-sm shadow-primary-500/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60',
                    isCollapsed && 'justify-center px-2'
                  )
                }
                title={isCollapsed ? label : undefined}
              >
                <span className="text-primary-400 group-hover:text-primary-300 transition-colors">
                  {item.icon}
                </span>

                {!isCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* User Scope Info Footer */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>রোল স্তর:</span>
              <span className="font-semibold text-primary-400">{userRole}</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">
              Hostel ERP v1.0 • PWA Ready
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar
