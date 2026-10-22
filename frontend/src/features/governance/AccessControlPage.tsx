import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  KeyRound,
  ShieldCheck,
  Users,
  Sparkles,
  ShieldAlert,
  Building,
  CreditCard,
  Receipt,
  DollarSign,
  ArrowRightLeft,
  Wallet,
  UtensilsCrossed,
  FileBarChart2,
  Check,
  CheckSquare,
  Square,
  Save,
  RotateCcw,
  Search,
  CheckCircle2,
  Lock,
  Sliders,
  Layers,
  Building2,
  Megaphone,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import {
  useAccessControlStore,
  CONFIGURABLE_ROLES,
  ERP_MENU_DEFINITIONS,
} from '@/app/store/useAccessControlStore'

// Dynamic icon mapper for menus
const MENU_ICONS: Record<string, React.ReactNode> = {
  Building: <Building className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  CreditCard: <CreditCard className="w-5 h-5" />,
  Receipt: <Receipt className="w-5 h-5" />,
  DollarSign: <DollarSign className="w-5 h-5" />,
  ArrowRightLeft: <ArrowRightLeft className="w-5 h-5" />,
  Wallet: <Wallet className="w-5 h-5" />,
  UtensilsCrossed: <UtensilsCrossed className="w-5 h-5" />,
  FileBarChart2: <FileBarChart2 className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  ShieldAlert: <ShieldAlert className="w-5 h-5" />,
  Megaphone: <Megaphone className="w-5 h-5" />,
}

const CATEGORY_NAMES: Record<string, string> = {
  ALL: 'সকল মেনু',
  core: 'হোস্টেল ও আবাসন',
  finance: 'বিলিং, আদায় ও ক্যাশ',
  kitchen: 'মিল ও কিচেন',
  governance: 'ইউজার ও সেটিংস',
  reports: 'রিপোর্ট ও স্টেটমেন্ট',
}

export const AccessControlPage: React.FC = () => {
  const { profile: currentUser } = useAuthStore()
  const {
    rolePermissions,
    activeRole,
    setActiveRole,
    toggleMenu,
    toggleOption,
    toggleAllForMenu,
    toggleAllForRole,
    resetRoleToDefault,
    savePermissions,
    isLoading,
  } = useAccessControlStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false)

  // STRICT RBAC: Only SUPER_ADMIN can view and manipulate Access Control
  if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
    return <Navigate to="/unauthorized" replace />
  }

  const currentRoleConfig = CONFIGURABLE_ROLES.find((r) => r.role === activeRole)!
  const currentRolePerms = rolePermissions[activeRole] || {}

  // Filtered menus
  const filteredMenus = ERP_MENU_DEFINITIONS.filter((menu) => {
    const matchesCategory = categoryFilter === 'ALL' || menu.category === categoryFilter
    const query = searchQuery.trim().toLowerCase()
    if (!query) return matchesCategory

    const matchesName = menu.name.toLowerCase().includes(query) || menu.nameEn.toLowerCase().includes(query)
    const matchesOption = menu.options.some(
      (opt) => opt.label.toLowerCase().includes(query) || opt.desc.toLowerCase().includes(query)
    )
    return matchesCategory && (matchesName || matchesOption)
  })

  // Summary counts for current role
  let totalMenusCount = ERP_MENU_DEFINITIONS.length
  let enabledMenusCount = 0
  let totalOptionsCount = 0
  let enabledOptionsCount = 0

  ERP_MENU_DEFINITIONS.forEach((menu) => {
    const menuState = currentRolePerms[menu.id]
    if (menuState?.enabled) enabledMenusCount++
    menu.options.forEach((opt) => {
      totalOptionsCount++
      if (menuState?.enabled && menuState?.options?.[opt.id]) {
        enabledOptionsCount++
      }
    })
  })

  const handleSave = async () => {
    await savePermissions()
    setSaveSuccessMessage(true)
    setTimeout(() => setSaveSuccessMessage(false), 4000)
  }

  const handleResetRole = () => {
    if (
      window.confirm(
        `আপনি কি নিশ্চিত যে "${currentRoleConfig.label}" পদবীর সকল পারমিশন সিস্টেমে নির্ধারিত মূল ডিফল্ট মানে ফেরত নিতে চান?`
      )
    ) {
      resetRoleToDefault(activeRole)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" />
              SUPER ADMIN ACCESS CONTROL & PERMISSIONS
            </span>
            <span className="text-xs text-slate-500">• Section 11.2</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <span>মেনু ও এক্সেস কন্ট্রোল ব্যবস্থাপনা</span>
            <span className="text-slate-500 font-light text-xl">| Operator Permission Matrix</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1.5 max-w-3xl">
            সুপার অ্যাডমিন ড্যাশবোর্ড থেকে অন্যান্য অপারেটরদের (অ্যাডমিন, ম্যানেজার, হিসাবরক্ষক, কিচেন অপারেটর) জন্য কোন কোন মেনু এবং মেনুর ভেতরের কোন কোন অপশন সক্রিয় থাকবে তা টিক মার্ক দিয়ে নির্ধারণ করুন।
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3 self-start lg:self-auto">
          <button
            type="button"
            onClick={handleResetRole}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white flex items-center gap-2 transition-all shadow-sm"
            title="এই পদবীর ডিফল্ট পারমিশনে ফিরুন"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">ডিফল্ট রিস্টোর</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>পারমিশন সংরক্ষণ করুন</span>
          </button>
        </div>
      </div>

      {/* 2. Settings Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <Link
          to="/settings/users"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Users className="w-4 h-4 text-indigo-400" />
          <span>কর্মকর্তা ও পদবী ব্যবস্থাপনা</span>
        </Link>
        <Link
          to="/settings/hostel"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/20 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Building2 className="w-4 h-4" />
          <span>হোস্টেল সেটিংস</span>
        </Link>
        <Link
          to="/settings/notices"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/20 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Megaphone className="w-4 h-4" />
          <span>হোস্টেল নোটিশ ও ঘোষণা</span>
        </Link>
        <Link
          to="/settings/audit-logs"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>সিস্টেম অডিট ট্রেইল</span>
        </Link>
        <Link
          to="/settings/access-control"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 flex items-center gap-2 whitespace-nowrap border border-cyan-400/40"
        >
          <KeyRound className="w-4 h-4 text-cyan-200" />
          <span>এক্সেস কন্ট্রোল ও পারমিশন</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/80 text-cyan-300 font-mono border border-cyan-400/30">
            SuperAdmin
          </span>
        </Link>
      </div>

      {/* 3. Feedback Notification Toast */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              সফলভাবে সংরক্ষিত! &quot;{currentRoleConfig.label}&quot; পদবীর জন্য নতুন মেনু ও অপশন পারমিশন তাৎক্ষণিকভাবে কার্যকর করা হয়েছে।
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/80 font-mono hidden sm:inline">স্বয়ংক্রিয় সিঙ্ক সম্পন্ন</span>
        </div>
      )}

      {/* 4. Operator Role Selection Tabs */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>অপারেটর পদবী নির্বাচন করুন (Select Target Role to Configure):</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            সুপার অ্যাডমিন সর্বদা পূর্ণ এক্সেস পাবেন (Full System Access)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {CONFIGURABLE_ROLES.map((r) => {
            const isSelected = activeRole === r.role
            const rolePerms = rolePermissions[r.role] || {}
            const activeMenus = Object.values(rolePerms).filter((m) => m?.enabled).length

            return (
              <button
                key={r.role}
                type="button"
                onClick={() => setActiveRole(r.role)}
                className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-cyan-950/50 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {r.label}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {activeMenus}/{totalMenusCount}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 leading-tight block">
                  {r.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. Role Summary Bar & Global Controls */}
      <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-cyan-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">{currentRoleConfig.label}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentRoleConfig.badgeColor}`}>
                {currentRoleConfig.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              বর্তমানে সক্রিয় মেনু:{' '}
              <strong className="text-cyan-300 font-mono">
                {enabledMenusCount} / {totalMenusCount}
              </strong>{' '}
              টি | অনুমোদিত ফিচার অপশন:{' '}
              <strong className="text-cyan-300 font-mono">
                {enabledOptionsCount} / {totalOptionsCount}
              </strong>{' '}
              টি
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleAllForRole(activeRole, true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 flex items-center gap-1.5 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>সকল অপশন টিক দিন</span>
          </button>
          <button
            type="button"
            onClick={() => toggleAllForRole(activeRole, false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 flex items-center gap-1.5 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            <span>সব আনচেক করুন</span>
          </button>
        </div>
      </div>

      {/* 6. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {Object.entries(CATEGORY_NAMES).map(([key, label]) => {
            const isActive = categoryFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="মেনু বা অপশন খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* 7. Menu-wise Permission Cards Grid */}
      <div className="space-y-4">
        {filteredMenus.map((menu) => {
          const menuState = currentRolePerms[menu.id] || { enabled: false, options: {} }
          const isMenuEnabled = menuState.enabled
          const options = menu.options
          const enabledOptsCount = options.filter((opt) => menuState.options?.[opt.id]).length

          return (
            <div
              key={menu.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isMenuEnabled
                  ? 'bg-slate-900/80 border-slate-700/80 shadow-lg shadow-black/20'
                  : 'bg-slate-900/30 border-slate-800/60 opacity-80'
              }`}
            >
              {/* Card Header: Menu Level Control */}
              <div
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                  isMenuEnabled
                    ? 'bg-slate-800/40 border-slate-700/70'
                    : 'bg-slate-950/40 border-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                      isMenuEnabled
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {MENU_ICONS[menu.iconName] || <Layers className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-sm font-bold ${
                          isMenuEnabled ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {menu.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({menu.nameEn})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        {CATEGORY_NAMES[menu.category]}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      পাথ: <code className="text-cyan-300 font-mono">{menu.path}</code>
                    </p>
                  </div>
                </div>

                {/* Master Menu Toggle & Quick Buttons */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        isMenuEnabled
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {enabledOptsCount}/{options.length} অপশন
                    </span>
                  </div>

                  {isMenuEnabled && (
                    <div className="flex items-center gap-1 border-r border-slate-700 pr-3">
                      <button
                        type="button"
                        onClick={() => toggleAllForMenu(activeRole, menu.id, true)}
                        className="px-2 py-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 rounded-lg transition-colors"
                        title="এই মেনুর সব অপশন টিক দিন"
                      >
                        সব সিলেক্ট
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAllForMenu(activeRole, menu.id, false)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        title="এই মেনুর সব অপশন আনচেক করুন"
                      >
                        সব আনচেক
                      </button>
                    </div>
                  )}

                  {/* Main Menu Checkbox / Toggle */}
                  <label className="cursor-pointer flex items-center gap-2 select-none">
                    <div
                      onClick={() => toggleMenu(activeRole, menu.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isMenuEnabled
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-400'
                          : 'bg-slate-800 border-slate-700 text-transparent hover:border-slate-500'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span
                      onClick={() => toggleMenu(activeRole, menu.id)}
                      className={`text-xs font-bold ${
                        isMenuEnabled ? 'text-cyan-300' : 'text-slate-400'
                      }`}
                    >
                      {isMenuEnabled ? 'মেনু সক্রিয়' : 'মেনু বন্ধ'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Card Body: Granular Option Checkboxes */}
              <div className="p-4">
                {!isMenuEnabled ? (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      এই মেনুটির অ্যাক্সেস বন্ধ রয়েছে। উপরের টিক বক্সে ক্লিক করে সক্রিয় করলে বিস্তারিত অপশনগুলো প্রযোজ্য হবে।
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {options.map((opt) => {
                      const isOptionChecked = Boolean(menuState.options?.[opt.id])

                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleOption(activeRole, menu.id, opt.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                            isOptionChecked
                              ? 'bg-slate-800/80 border-cyan-500/40 shadow-sm hover:border-cyan-400/60'
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          {/* Styled Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 transition-all ${
                              isOptionChecked
                                ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400/40'
                                : 'bg-slate-800 border-slate-700 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>

                          <div className="space-y-0.5 flex-1 min-w-0">
                            <span
                              className={`text-xs font-bold block leading-snug ${
                                isOptionChecked ? 'text-slate-100' : 'text-slate-400'
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="text-[11px] text-slate-400 block leading-normal line-clamp-2">
                              {opt.desc}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {filteredMenus.length === 0 && (
          <div className="p-8 rounded-2xl glass-card border border-slate-800 text-center space-y-2">
            <Search className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">কোন মেনু বা অপশন পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500">অনুসন্ধান বা ক্যাটাগরি ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।</p>
          </div>
        )}
      </div>

      {/* 8. Bottom Sticky / Action Bar */}
      <div className="sticky bottom-4 z-20 p-4 rounded-2xl glass-card border border-cyan-500/30 bg-slate-950/95 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <KeyRound className="w-4 h-4 text-cyan-400" />
          <span>
            পদবী: <strong className="text-white">{currentRoleConfig.label}</strong>-এর জন্য টিক মার্ক পরিবর্তন করা হয়েছে।
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetRole}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
          >
            ডিফল্ট রিস্টোর
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>সেভ করুন (Save Changes)</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccessControlPage
