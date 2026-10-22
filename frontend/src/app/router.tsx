import React from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import type { UserRole } from '@/types/database'
import UnauthorizedView from '@/views/auth/UnauthorizedView'

import AppLayout from '@/components/layout/AppLayout'

// Lazy-loaded or placeholder route component helper
export interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, profile, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-400 font-medium">নিরাপত্তা স্তর যাচাই করা হচ্ছে...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // APPLICANT isolation: Applicants are strictly confined to their application view
  if (profile?.role === 'APPLICANT' && !location.pathname.startsWith('/portal/my-application')) {
    return <Navigate to="/portal/my-application" replace />
  }

  // Role validation
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'BOARDER') {
      return <Navigate to="/portal/dashboard" replace />
    }
    return <Navigate to="/unauthorized" replace />
  }

  return children ? <>{children}</> : <Outlet />
}



import OwnerDashboardPage from '@/features/dashboard/OwnerDashboardPage'
import BoarderDashboardPage from '@/features/dashboard/BoarderDashboardPage'
import LoginPage from '@/features/auth/LoginPage'
import RegisterPortal from '@/features/auth/RegisterPortal'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import ApplicationStatusPage from '@/features/auth/ApplicationStatusPage'

import AccommodationPage from '@/features/accommodation/AccommodationPage'
import BoarderListPage from '@/features/boarders/BoarderListPage'
import BoarderDetailPage from '@/features/boarders/BoarderDetailPage'
import BoarderDuesPage from '@/features/billing/BoarderDuesPage'
import ReceiptListPage from '@/features/billing/ReceiptListPage'
import ExpenseListPage from '@/features/expenses/ExpenseListPage'
import IncomeListPage from '@/features/finance/IncomeListPage'
import AccountTransfersPage from '@/features/finance/AccountTransfersPage'
import FinancialAccountsPage from '@/features/finance/FinancialAccountsPage'
import ManagerCashDashboard from '@/features/cash-custody/ManagerCashDashboard'
import BoarderMealPortal from '@/features/meals/BoarderMealPortal'
import KitchenMealSummaryPage from '@/features/meals/KitchenMealSummaryPage'
import MealSettingsPage from '@/features/meals/MealSettingsPage'
import ReportsHubPage from '@/features/reports/ReportsHubPage'
import AuditLogPage from '@/features/governance/AuditLogPage'
import UserManagementPage from '@/features/governance/UserManagementPage'
import HostelSettingsPage from '@/features/settings/HostelSettingsPage'
import AccessControlPage from '@/features/governance/AccessControlPage'
import NoticesPage from '@/features/notices/NoticesPage'
import BoarderPortalDuesPage from '@/features/portal/BoarderDuesPage'


export const router = createBrowserRouter([
  // Public Routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPortal />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedView />,
  },

  // Boarder Self-Service Portal
  {
    path: '/portal',
    element: (
      <ProtectedRoute allowedRoles={['BOARDER', 'APPLICANT', 'SUPER_ADMIN', 'ADMIN']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/portal/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <BoarderDashboardPage />,
      },
      {
        path: 'my-meals',
        element: <BoarderMealPortal />,
      },
      {
        path: 'my-dues',
        element: <BoarderPortalDuesPage />,
      },
      {
        path: 'my-application',
        element: <ApplicationStatusPage />,
      },
    ],
  },

  // Staff / Admin Master ERP
  {
    path: '/',
    element: (
      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <OwnerDashboardPage />,
      },
      {
        path: 'accommodation/*',
        element: <AccommodationPage />,
      },
      {
        path: 'boarders',
        element: <BoarderListPage />,
      },
      {
        path: 'boarders/:id',
        element: <BoarderDetailPage />,
      },
      {
        path: 'notices',
        element: <NoticesPage />,
      },
      {
        path: 'billing',
        element: <BoarderDuesPage />,
      },
      {
        path: 'billing/dues',
        element: <BoarderDuesPage />,
      },
      {
        path: 'billing/receipts',
        element: <ReceiptListPage />,
      },
      {
        path: 'billing/*',
        element: <BoarderDuesPage />,
      },
      {
        path: 'expenses',
        element: <ExpenseListPage />,
      },
      {
        path: 'expenses/*',
        element: <ExpenseListPage />,
      },
      {
        path: 'finance/accounts',
        element: <FinancialAccountsPage />,
      },
      {
        path: 'accounts',
        element: <FinancialAccountsPage />,
      },
      {
        path: 'finance/transfers',
        element: <AccountTransfersPage />,
      },
      {
        path: 'finance/income',
        element: <IncomeListPage />,
      },
      {
        path: 'finance/*',
        element: <FinancialAccountsPage />,
      },
      {
        path: 'incomes',
        element: <IncomeListPage />,
      },
      {
        path: 'transfers',
        element: <AccountTransfersPage />,
      },
      {
        path: 'cash-custody',
        element: <ManagerCashDashboard />,
      },
      {
        path: 'cash-custody/*',
        element: <ManagerCashDashboard />,
      },
      {
        path: 'meals',
        element: <KitchenMealSummaryPage />,
      },
      {
        path: 'meals/my-meals',
        element: <BoarderMealPortal />,
      },
      {
        path: 'meals/settings',
        element: <MealSettingsPage />,
      },
      {
        path: 'meals/billing',
        element: <MealSettingsPage />,
      },
      {
        path: 'meals/audit',
        element: <MealSettingsPage />,
      },
      {
        path: 'meals/*',
        element: <KitchenMealSummaryPage />,
      },
      {
        path: 'reports',
        element: <ReportsHubPage />,
      },
      {
        path: 'reports/*',
        element: <ReportsHubPage />,
      },
      {
        path: 'settings',
        element: <Navigate to="/settings/users" replace />,
      },
      {
        path: 'settings/users',
        element: <UserManagementPage />,
      },
      {
        path: 'settings/hostel',
        element: <HostelSettingsPage />,
      },
      {
        path: 'settings/branding',
        element: <HostelSettingsPage />,
      },
      {
        path: 'settings/notices',
        element: <NoticesPage />,
      },
      {
        path: 'settings/access-control',
        element: (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <AccessControlPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/audit-logs',
        element: <AuditLogPage />,
      },
      {
        path: 'settings/*',
        element: <UserManagementPage />,
      },
      {
        path: 'audit-logs',
        element: <AuditLogPage />,
      },
    ],
  },

  // Fallback Catch-all
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
