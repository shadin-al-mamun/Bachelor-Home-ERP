import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UtensilsCrossed,
  CreditCard,
  Menu,
  FileBarChart2,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { cn } from '@/utils/cn'

interface MobileNavProps {
  onOpenMobileMenu: () => void
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMobileMenu }) => {
  const { profile } = useAuthStore()
  const role = profile?.role || 'SUPER_ADMIN'
  const isBoarder = role === 'BOARDER'

  const links = [
    {
      label: 'হোম',
      href: isBoarder ? '/portal/dashboard' : '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'খাবার',
      href: isBoarder ? '/portal/my-meals' : '/meals',
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      label: isBoarder ? 'রশিদ' : 'বিলিং',
      href: isBoarder ? '/portal/my-dues' : '/billing',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      label: 'রিপোর্ট',
      href: '/reports',
      icon: <FileBarChart2 className="w-5 h-5" />,
      hideOnBoarder: true,
    },
  ].filter((item) => !(item.hideOnBoarder && isBoarder))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 glass border-t border-slate-800/80 lg:hidden px-3 flex items-center justify-around shadow-2xl backdrop-blur-xl">
      {links.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all',
              isActive
                ? 'text-primary-400 font-semibold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          {item.icon}
          <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
        </NavLink>
      ))}

      <button
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center w-14 py-1 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-tight">মেনু</span>
      </button>
    </nav>
  )
}

export default MobileNav
