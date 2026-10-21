import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building,
  Users,
  Wallet,
  UtensilsCrossed,
  FileBarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  CalendarCheck,
  Receipt,
  DollarSign,
  ArrowRightLeft,
  Sparkles,
  KeyRound,
  ShieldAlert,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useBrandingStore } from '@/app/store/useBrandingStore'
import { useAccessControlStore } from '@/app/store/useAccessControlStore'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import { cn } from '@/utils/cn'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

export interface NavItemLink {
  type?: 'link'
  id: string
  titleKey: string
  defaultTitle: string
  href: string
  icon: React.ReactNode
  roles: string[]
  badge?: string
  permissionKey?: string
}

export interface NavItemGroup {
  type: 'group'
  id: string
  titleKey: string
  defaultTitle: string
  icon: React.ReactNode
  children: NavItemLink[]
}

export type NavItem = NavItemLink | NavItemGroup

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const { logoUrl, shortName } = useBrandingStore()
  const { hasMenuAccess } = useAccessControlStore()
  const location = useLocation()
  const currentPath = location.pathname
  const userRole = profile?.role || 'SUPER_ADMIN'

  // Helper to check if a specific child URL is currently active
  const isChildActive = (href: string) => {
    if (href === '/dashboard' || href === '/portal/dashboard') {
      return currentPath === href
    }
    return currentPath === href || currentPath.startsWith(href + '/')
  }

  // Master Hierarchical Navigation Items
  const navItems: NavItem[] = [
    // Top-Level Dashboard
    {
      type: 'link',
      id: 'dashboard',
      titleKey: userRole === 'BOARDER' ? 'portal.dashboard' : 'nav.dashboard',
      defaultTitle: userRole === 'BOARDER' ? 'আমার ড্যাশবোর্ড' : 'ড্যাশবোর্ড',
      href: userRole === 'BOARDER' ? '/portal/dashboard' : '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR', 'BOARDER'],
    },

    // Accommodations & Bed Allocation
    {
      type: 'link',
      id: 'accommodations',
      titleKey: 'nav.accommodations',
      defaultTitle: 'আবাসন ও সিট',
      href: '/accommodation',
      icon: <Building className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
      permissionKey: 'accommodations',
    },

    // Boarders Directory & Registry
    {
      type: 'link',
      id: 'boarders',
      titleKey: 'nav.boarders',
      defaultTitle: 'আবাসিক বোর্ডার তালিকা',
      href: '/boarders',
      icon: <Users className="w-5 h-5 shrink-0" />,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
      permissionKey: 'boarders',
    },

    // Submenu Group: মিল ব্যবস্থাপনা (Meal Management)
    {
      type: 'group',
      id: 'meal_management',
      titleKey: 'nav.meal_management',
      defaultTitle: 'মিল ব্যবস্থাপনা',
      icon: <UtensilsCrossed className="w-5 h-5 shrink-0 text-amber-400" />,
      children: [
        {
          id: 'meals',
          titleKey: 'nav.meals',
          defaultTitle: 'খাবার ইঞ্জিন (কিচেন)',
          href: '/meals',
          icon: <UtensilsCrossed className="w-4 h-4 shrink-0 text-amber-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEAL_OPERATOR', 'AUDITOR'],
          permissionKey: 'meals',
        },
        {
          id: 'meal_settings',
          titleKey: 'nav.meal_settings',
          defaultTitle: 'মিল রেট ও বিলিং সেটিংস',
          href: '/meals/settings',
          icon: <DollarSign className="w-4 h-4 shrink-0 text-amber-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
          permissionKey: 'meal_settings',
        },
      ],
    },

    // Submenu Group: বিলিং ও ফাইনান্স (Billing & Finance)
    {
      type: 'group',
      id: 'billing_finance',
      titleKey: 'nav.billing_finance',
      defaultTitle: 'বিলিং ও ফাইনান্স',
      icon: <Wallet className="w-5 h-5 shrink-0 text-emerald-400" />,
      children: [
        {
          id: 'collections',
          titleKey: 'nav.collections',
          defaultTitle: '১. বিল আদায়',
          href: '/billing',
          icon: <Receipt className="w-4 h-4 shrink-0 text-emerald-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
          permissionKey: 'billing',
        },
        {
          id: 'expenses',
          titleKey: 'nav.expenses',
          defaultTitle: '২. খরচ (Expenses)',
          href: '/expenses',
          icon: <DollarSign className="w-4 h-4 shrink-0 text-rose-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
          permissionKey: 'expenses',
        },
        {
          id: 'accounts',
          titleKey: 'nav.accounts',
          defaultTitle: '৩. অ্যাকাউন্ট (Accounts)',
          href: '/finance/accounts',
          icon: <Wallet className="w-4 h-4 shrink-0 text-cyan-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
          permissionKey: 'accounts',
        },
        {
          id: 'transfers',
          titleKey: 'nav.transfers',
          defaultTitle: '৪. টাকা ট্রান্সফার',
          href: '/finance/transfers',
          icon: <ArrowRightLeft className="w-4 h-4 shrink-0 text-indigo-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
          permissionKey: 'transfers',
        },
        {
          id: 'reports',
          titleKey: 'nav.reports',
          defaultTitle: '৫. রিপোর্ট (Reports)',
          href: '/reports',
          icon: <FileBarChart2 className="w-4 h-4 shrink-0 text-amber-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'],
          permissionKey: 'reports',
        },
      ],
    },

    // Submenu Group: সিস্টেম সেটিংস (System Settings)
    {
      type: 'group',
      id: 'system_settings',
      titleKey: 'nav.settings',
      defaultTitle: 'সিস্টেম সেটিংস',
      icon: <Settings className="w-5 h-5 shrink-0 text-indigo-400" />,
      children: [
        {
          id: 'governance',
          titleKey: 'nav.governance',
          defaultTitle: 'কর্মকর্তা ও পদবী ব্যবস্থাপনা',
          href: '/settings/users',
          icon: <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN'],
          permissionKey: 'governance',
        },
        {
          id: 'branding',
          titleKey: 'nav.branding',
          defaultTitle: 'হোস্টেল লোগো ও অ্যাপ ব্রান্ডিং',
          href: '/settings/branding',
          icon: <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN'],
          permissionKey: 'branding',
          badge: 'নতুন',
        },
        {
          id: 'access_control',
          titleKey: 'nav.access_control',
          defaultTitle: 'মেনু ও একসেস কন্ট্রোল ব্যবস্থাপনা',
          href: '/settings/access-control',
          icon: <KeyRound className="w-4 h-4 shrink-0 text-cyan-400" />,
          roles: ['SUPER_ADMIN'],
          badge: 'SuperAdmin',
        },
        {
          id: 'audit_logs',
          titleKey: 'nav.audit_logs',
          defaultTitle: 'সিস্টেম অডিট ট্রেইল',
          href: '/settings/audit-logs',
          icon: <ShieldAlert className="w-4 h-4 shrink-0 text-slate-400" />,
          roles: ['SUPER_ADMIN', 'ADMIN'],
          permissionKey: 'governance',
        },
      ],
    },

    // Boarder specific self-service portal links
    {
      type: 'link',
      id: 'portal_meals',
      titleKey: 'portal.myMeals',
      defaultTitle: 'আমার মিল নির্বাচন',
      href: '/portal/my-meals',
      icon: <CalendarCheck className="w-5 h-5 shrink-0" />,
      roles: ['BOARDER'],
    },
    {
      type: 'link',
      id: 'portal_dues',
      titleKey: 'portal.myDues',
      defaultTitle: 'আমার বকেয়া ও রশিদ',
      href: '/portal/my-dues',
      icon: <Receipt className="w-5 h-5 shrink-0" />,
      roles: ['BOARDER'],
    },
  ]

  const { data: pendingBoarders = [] } = useBoarders({ status: 'PENDING' })

  // Collapsible Submenu Groups state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    meal_management: true,
    billing_finance: true,
    system_settings: false,
  }))

  // Flyout menu state for collapsed sidebar
  const [activeFlyoutGroup, setActiveFlyoutGroup] = useState<string | null>(null)

  // Automatically expand group containing active route on path change
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.type === 'group') {
        const containsActive = item.children.some((child) => isChildActive(child.href))
        if (containsActive) {
          setOpenGroups((prev) => ({ ...prev, [item.id]: true }))
        }
      }
    })
  }, [currentPath])

  // Filter navigation items by role and dynamic access permissions
  const checkChildAccess = (child: NavItemLink) => {
    if (userRole === 'BOARDER' || userRole === 'APPLICANT') {
      return child.roles.includes(userRole)
    }

    if (userRole === 'SUPER_ADMIN') {
      return child.roles.includes('SUPER_ADMIN')
    }

    // Access control page is strictly restricted to SUPER_ADMIN only
    if (child.href === '/settings/access-control') {
      return false
    }

    if (child.permissionKey) {
      return hasMenuAccess(userRole, child.permissionKey)
    }

    return child.roles.includes(userRole)
  }

  const filteredNavItems = navItems.reduce<NavItem[]>((acc, item) => {
    if (item.type === 'group') {
      const allowedChildren = item.children.filter(checkChildAccess)
      if (allowedChildren.length > 0) {
        acc.push({
          ...item,
          children: allowedChildren,
        })
      }
    } else {
      if (checkChildAccess(item)) {
        acc.push(item)
      }
    }
    return acc
  }, [])

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const getItemLabel = (titleKey: string, defaultTitle: string) => {
    return t(titleKey) !== titleKey ? t(titleKey) : defaultTitle
  }

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
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                )}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block truncate">
                  {shortName || 'Bachelor Home'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  ERP Navigation
                </span>
              </div>
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
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          {filteredNavItems.map((item) => {
            // Case 1: Submenu Group Item (e.g. মিল ব্যবস্থাপনা, বিলিং ও ফাইনান্স, সিস্টেম সেটিংস)
            if (item.type === 'group') {
              const groupLabel = getItemLabel(item.titleKey, item.defaultTitle)
              const hasActiveChild = item.children.some((c) => isChildActive(c.href))
              const isOpen = !!openGroups[item.id]

              // When sidebar is collapsed: Render icon with hover/click flyout
              if (isCollapsed) {
                const isFlyoutOpen = activeFlyoutGroup === item.id

                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setActiveFlyoutGroup(item.id)}
                    onMouseLeave={() => setActiveFlyoutGroup(null)}
                  >
                    <button
                      onClick={() => setActiveFlyoutGroup(isFlyoutOpen ? null : item.id)}
                      className={cn(
                        'w-full flex items-center justify-center py-2.5 rounded-xl text-xs font-medium transition-all select-none',
                        hasActiveChild
                          ? 'bg-primary-600/20 text-white border border-primary-500/40 shadow-sm shadow-primary-500/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      )}
                      title={groupLabel}
                    >
                      <div className="relative">
                        {item.icon}
                        {hasActiveChild && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-400 ring-2 ring-slate-900" />
                        )}
                      </div>
                    </button>

                    {/* Collapsed Flyout Submenu */}
                    {isFlyoutOpen && (
                      <div className="absolute left-full top-0 ml-2 w-56 p-2 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-2xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-300 flex items-center gap-2">
                          {item.icon}
                          <span className="truncate">{groupLabel}</span>
                        </div>
                        <div className="space-y-1 pt-1">
                          {item.children.map((child) => {
                            const childLabel = getItemLabel(child.titleKey, child.defaultTitle)
                            const active = isChildActive(child.href)

                            return (
                              <NavLink
                                key={child.href}
                                to={child.href}
                                onClick={() => {
                                  setActiveFlyoutGroup(null)
                                  onCloseMobile?.()
                                }}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all select-none',
                                  active
                                    ? 'bg-primary-600/25 text-white border border-primary-500/40 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                                )}
                              >
                                {child.icon}
                                <span className="truncate flex-1">{childLabel}</span>
                                {child.badge && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    {child.badge}
                                  </span>
                                )}
                              </NavLink>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              // When sidebar is expanded: Render accordion dropdown
              return (
                <div key={item.id} className="space-y-1 select-none">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group select-none text-left',
                      hasActiveChild
                        ? 'bg-slate-800/60 text-slate-100 border border-slate-700/60'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-primary-400 group-hover:text-primary-300 transition-colors">
                        {item.icon}
                      </div>
                      <span className="truncate font-semibold tracking-wide text-[12px]">{groupLabel}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasActiveChild && !isOpen && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shadow-sm shadow-primary-400/80 animate-pulse" />
                      )}
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-slate-400 transition-transform duration-200',
                          isOpen && 'rotate-180 text-slate-200'
                        )}
                      />
                    </div>
                  </button>

                  {/* Accordion Sub-items */}
                  {isOpen && (
                    <div className="pl-3 ml-4.5 my-1 border-l-2 border-slate-800/90 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      {item.children.map((child) => {
                        const childLabel = getItemLabel(child.titleKey, child.defaultTitle)
                        const active = isChildActive(child.href)

                        return (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            onClick={onCloseMobile}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group select-none',
                              active
                                ? 'bg-primary-600/25 text-white border border-primary-500/40 shadow-sm shadow-primary-500/10 font-semibold'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                            )}
                          >
                            <div className="shrink-0 transition-colors">
                              {child.icon}
                            </div>
                            <span className="truncate flex-1">{childLabel}</span>
                            {child.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                {child.badge}
                              </span>
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            // Case 2: Direct Single Navigation Link (e.g. ড্যাশবোর্ড, আবাসন ও সিট, আবাসিক বোর্ডার)
            const label = getItemLabel(item.titleKey, item.defaultTitle)
            const isBoardersLink = item.href === '/boarders'
            const hasPending = isBoardersLink && pendingBoarders.length > 0
            const active = isChildActive(item.href)

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group select-none relative',
                  active
                    ? 'bg-primary-600/20 text-white border border-primary-500/40 shadow-sm shadow-primary-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60',
                  isCollapsed && 'justify-center px-2'
                )}
                title={isCollapsed ? label : undefined}
              >
                <div className="relative text-primary-400 group-hover:text-primary-300 transition-colors">
                  {item.icon}
                  {isCollapsed && hasPending && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-slate-900 animate-pulse" />
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{label}</span>
                    {hasPending ? (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse shrink-0">
                        {pendingBoarders.length}
                      </span>
                    ) : item.badge ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                )}
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
