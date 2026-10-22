import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export type ConfigurableRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'MEAL_OPERATOR' | 'AUDITOR'

export interface PermissionOption {
  id: string
  label: string
  desc: string
}

export interface MenuDefinition {
  id: string
  name: string
  nameEn: string
  category: 'core' | 'finance' | 'kitchen' | 'governance' | 'reports'
  iconName: string
  path: string
  options: PermissionOption[]
}

export interface MenuPermissionState {
  enabled: boolean
  options: Record<string, boolean>
}

export type RolePermissionsMap = Record<string, MenuPermissionState>
export type AllRolesPermissions = Record<ConfigurableRole, RolePermissionsMap>

export const CONFIGURABLE_ROLES: { role: ConfigurableRole; label: string; desc: string; badgeColor: string }[] = [
  { role: 'ADMIN', label: 'অ্যাডমিন (হোস্টেল প্রশাসক)', desc: 'Hostel Operations & Management', badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  { role: 'MANAGER', label: 'ম্যানেজার (হোস্টেল ম্যানেজার)', desc: 'Cash Custody & Shift Ops', badgeColor: 'bg-blue-950 text-blue-300 border-blue-800' },
  { role: 'ACCOUNTANT', label: 'অ্যাকাউন্ট্যান্ট (হিসাবরক্ষক)', desc: 'Vouchers & Financial Approvals', badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  { role: 'MEAL_OPERATOR', label: 'মিল অপারেটর (বাবুর্চি / কিচেন ইনচার্জ)', desc: 'Kitchen & Meal Overrides', badgeColor: 'bg-amber-950 text-amber-300 border-amber-800' },
  { role: 'AUDITOR', label: 'নিরীক্ষক (অডিটর)', desc: 'Read-only Audit & Compliance', badgeColor: 'bg-rose-950 text-rose-300 border-rose-800' },
]

export const ERP_MENU_DEFINITIONS: MenuDefinition[] = [
  {
    id: 'accommodations',
    name: 'আবাসন ও সিট ব্যবস্থাপনা',
    nameEn: 'Accommodations & Seat Matrix',
    category: 'core',
    iconName: 'Building',
    path: '/accommodation',
    options: [
      { id: 'view_matrix', label: 'রুম ও সিট ম্যাট্রিক্স গ্রিড দেখা', desc: 'সকল বিল্ডিং, ফ্ল্যাট, রুম ও সিটের বর্তমান স্ট্যাটাস দেখা' },
      { id: 'allocate_seat', label: 'নতুন সিট বরাদ্দ করা (Seat Allocation)', desc: 'নতুন অথবা অপেক্ষমান বোর্ডারকে সিট বরাদ্দ দেওয়া' },
      { id: 'transfer_seat', label: 'সিট স্থানান্তর (Seat Transfer)', desc: 'বোর্ডারের বর্তমান সিট অন্য খালি সিটে স্থানান্তর করা' },
      { id: 'checkout_seat', label: 'সিট প্রস্থান ও রিলিজ (Departure)', desc: 'বোর্ডারের সিট প্রস্থান কার্যকর ও সিট খালি করা' },
      { id: 'manage_buildings', label: 'বিল্ডিং ও ফ্ল্যাট তৈরি/সম্পাদন', desc: 'নতুন বিল্ডিং ও ফ্ল্যাট যুক্ত করা ও নিষ্ক্রিয় করা' },
      { id: 'manage_rooms', label: 'রুম ও সিটের ভাড়া কনফিগার করা', desc: 'রুম নম্বর, সিট নম্বর ও মাসিক ভাড়া নির্ধারণ করা' },
    ],
  },
  {
    id: 'boarders',
    name: 'আবাসিক বোর্ডার রেজিস্ট্রি',
    nameEn: 'Boarders Directory',
    category: 'core',
    iconName: 'Users',
    path: '/boarders',
    options: [
      { id: 'view_list', label: 'বোর্ডারদের তালিকা দেখা', desc: 'সক্রিয়, সাবেক ও অপেক্ষমান বোর্ডার তালিকা ব্রাউজ করা' },
      { id: 'review_applicants', label: 'নতুন আবেদন যাচাই ও অনুমোদন', desc: 'অনলাইন রেজিস্ট্রেশন আবেদন পর্যালোচনা ও অনুমোদন করা' },
      { id: 'edit_boarder', label: 'বোর্ডারের ব্যক্তিগত তথ্য পরিবর্তন', desc: 'নাম, মোবাইল, অভিভাবক ও এনআইডি তথ্য আপডেট করা' },
      { id: 'view_history', label: 'বোর্ডার হিস্ট্রি ও লেজার দেখা', desc: 'সিট পরিবর্তনের ইতিহাস ও ব্যক্তিগত লেনদেন বিবরণী দেখা' },
    ],
  },
  {
    id: 'billing',
    name: 'বকেয়া ও বিলিং লেজার',
    nameEn: 'Billing & Dues Ledger',
    category: 'finance',
    iconName: 'CreditCard',
    path: '/billing',
    options: [
      { id: 'view_dues', label: 'সকল বকেয়া ও ডিউ লেজার দেখা', desc: 'বোর্ডারভিত্তিক সিট ভাড়া ও মেস চার্জের বকেয়া দেখা' },
      { id: 'generate_bill', label: 'মাসিক বিল ও চার্জ জেনারেট করা', desc: 'মাসিক সিট ভাড়া ও নির্ধারিত ইউটিলিটি চার্জ নির্ধারণ' },
      { id: 'adjust_charge', label: 'চার্জ সমন্বয় ও ছাড় দেওয়া (Discount/Waiver)', desc: 'বোর্ডারের বকেয়া বিলে মওকুফ বা জরিমানা যোগ করা' },
    ],
  },
  {
    id: 'collections',
    name: 'ভাড়া আদায় ও মানি রিসিপ্ট',
    nameEn: 'Collections & Money Receipts',
    category: 'finance',
    iconName: 'Receipt',
    path: '/billing/receipts',
    options: [
      { id: 'view_receipts', label: 'মানি রিসিপ্ট তালিকা দেখা', desc: 'ইতিপূর্বে আদায়কৃত সকল পেমেন্ট রশিদ ব্রাউজ করা' },
      { id: 'collect_rent', label: 'ভাড়া ও পেমেন্ট আদায় (Collect Payment)', desc: 'নগদ, ব্যাংক বা এমএফএস মাধ্যমে ভাড়া আদায় করে রসিদ কাটা' },
      { id: 'cancel_receipt', label: 'ভুল রসিদ বাতিল করা (Void Receipt)', desc: 'ভুলবশত তৈরিকৃত রসিদ বাতিল ও আর্থিক ব্যালেন্স রিভার্স করা' },
      { id: 'print_receipt', label: 'মানি রিসিপ্ট প্রিন্ট ও ডাউনলোড', desc: 'পিডিএফ রসিদ প্রিন্ট ও শেয়ার করার সুবিধা' },
    ],
  },
  {
    id: 'expenses',
    name: 'দৈনিক খরচ ও ভাউচার',
    nameEn: 'Daily Expenses & Vouchers',
    category: 'finance',
    iconName: 'Receipt',
    path: '/expenses',
    options: [
      { id: 'view_expenses', label: 'দৈনিক খরচের তালিকা ও ভাউচার দেখা', desc: 'তারিখভিত্তিক যাবতীয় মেস ও অফিস খরচের তালিকা দেখা' },
      { id: 'create_expense', label: 'নতুন খরচ ভাউচার এন্ট্রি করা', desc: 'ক্যাশ বা ব্যাংক অ্যাকাউন্ট থেকে খরচের ভাউচার তৈরি' },
      { id: 'approve_expense', label: 'খরচ ভাউচার অনুমোদন ও অডিট', desc: 'ম্যানেজারের খরচের ভাউচার নিরীক্ষা ও অনুমোদন' },
      { id: 'manage_categories', label: 'খরচের ক্যাটাগরি তৈরি/সম্পাদন', desc: 'বাজার, ইউটিলিটি, মেরামত ইত্যাদি হেড কনফিগার করা' },
    ],
  },
  {
    id: 'incomes',
    name: 'অন্যান্য বিবিধ আয়',
    nameEn: 'Other Incomes',
    category: 'finance',
    iconName: 'DollarSign',
    path: '/finance/income',
    options: [
      { id: 'view_incomes', label: 'অন্যান্য আয়ের তালিকা দেখা', desc: 'ভর্তি ফি, স্ক্র্যাপ বিক্রি ইত্যাদি আয়ের রেকর্ড দেখা' },
      { id: 'create_income', label: 'নতুন বিবিধ আয় এন্ট্রি করা', desc: 'অতিরিক্ত আয়ের ভাউচার সিস্টেমে যুক্ত করা' },
    ],
  },
  {
    id: 'transfers',
    name: 'একাউন্ট স্থানান্তর (Fund Transfer)',
    nameEn: 'Account Fund Transfers',
    category: 'finance',
    iconName: 'ArrowRightLeft',
    path: '/finance/transfers',
    options: [
      { id: 'view_transfers', label: 'স্থানান্তর হিস্ট্রি ও ব্যালেন্স দেখা', desc: 'হাতে নগদ, ব্যাংক ও বিকাশ ব্যালেন্স বিবরণী দেখা' },
      { id: 'create_transfer', label: 'নতুন ফান্ড ট্রান্সফার করা', desc: 'এক অ্যাকাউন্ট থেকে অন্য অ্যাকাউন্টে তহবিল স্থানান্তর' },
    ],
  },
  {
    id: 'accounts',
    name: 'অ্যাকাউন্ট ও খতিয়ান',
    nameEn: 'Financial Accounts & Ledger',
    category: 'finance',
    iconName: 'CreditCard',
    path: '/finance/accounts',
    options: [
      { id: 'view_accounts', label: 'সকল অ্যাকাউন্ট ও লাইভ ব্যালেন্স দেখা', desc: 'মেইন, ম্যানেজার ও ওনার অ্যাকাউন্টের স্থিতি দেখা' },
      { id: 'manage_opening_balance', label: 'প্রারম্ভিক ব্যালেন্স সেট/আপডেট', desc: 'অ্যাকাউন্টের প্রারম্ভিক ব্যালেন্স কনফিগার করা' },
      { id: 'view_ledger', label: 'অ্যাকাউন্ট রানিং বিবরণী দেখা', desc: 'তারিখভিত্তিক জমা, খরচ ও ব্যালেন্স বিবরণী দেখা' },
    ],
  },
  {
    id: 'cashbook',
    name: 'ম্যানেজার ক্যাশবুক ও নগদ ক্লোজিং',
    nameEn: 'Cash Custody & Daily Closing',
    category: 'finance',
    iconName: 'Wallet',
    path: '/cash-custody',
    options: [
      { id: 'view_cashbook', label: 'ক্যাশবুক ও চলমান ব্যালেন্স দেখা', desc: 'দিনের নগদ জমা, খরচ ও বর্তমান ক্যাশ-ইন-হ্যান্ড দেখা' },
      { id: 'daily_closing', label: 'দিনের ক্যাশ ক্লোজিং সাবমিট করা', desc: 'দিনশেষে ফিজিক্যাল ক্যাশ গুনে ক্লোজিং সাবমিট করা' },
      { id: 'cash_handover', label: 'শিফট ক্যাশ হস্তান্তর (Shift Handover)', desc: 'পরবর্তী শিফট ইনচার্জের কাছে নগদ টাকা হস্তান্তর' },
      { id: 'owner_deposit', label: 'মালিককে ক্যাশ ডিপোজিট হস্তান্তর', desc: 'হোস্টেল ওনারকে ব্যাংকে বা নগদে টাকা স্থানান্তর' },
    ],
  },
  {
    id: 'meals',
    name: 'খাবার ইঞ্জিন ও কিচেন কন্ট্রোল',
    nameEn: 'Kitchen & Meal Engine',
    category: 'kitchen',
    iconName: 'UtensilsCrossed',
    path: '/meals',
    options: [
      { id: 'kitchen_board', label: 'আজকের মিল সামারি ও কুক কাউন্ট দেখা', desc: 'সকাল, দুপুর ও রাতের সক্রিয় খাবারের সংখ্যা দেখা' },
      { id: 'toggle_meals', label: 'বোর্ডারের পক্ষে মিল অন/অফ পরিবর্তন', desc: 'অফিসিয়ালি বর্ডারের মিল স্ট্যাটাস চালু বা বন্ধ করা' },
      { id: 'bazaar_expense', label: 'কিচেন বাজার খরচ এন্ট্রি করা', desc: 'প্রতিদিনের বাজার বাবদ ব্যয় সরাসরি যুক্ত করা' },
    ],
  },
  {
    id: 'meal_settings',
    name: 'মিল রেট ও কিচেন সেটিংস',
    nameEn: 'Meal Rate & Billing Settings',
    category: 'kitchen',
    iconName: 'DollarSign',
    path: '/meals/settings',
    options: [
      { id: 'view_settings', label: 'বর্তমান মিল রেট ও ক্যালকুলেশন দেখা', desc: 'ফিক্সড বা পরিবর্তনশীল মিল রেট হিসাব পর্যবেক্ষণ' },
      { id: 'edit_settings', label: 'মিল রেট ও কাট-অফ সময় পরিবর্তন', desc: 'রাত ১০টার কাট-অফ সময় ও মিলের দাম পরিবর্তন করা' },
    ],
  },
  {
    id: 'reports',
    name: 'রিপোর্ট ও আর্থিক স্টেটমেন্ট',
    nameEn: 'Reports & Statements',
    category: 'reports',
    iconName: 'FileBarChart2',
    path: '/reports',
    options: [
      { id: 'financial_report', label: 'মাসিক লাভ-ক্ষতি ও আয়-ব্যয় রিপোর্ট', desc: 'মেসের মোট আয়, মোট ব্যয় ও নিট মুনাফা বিবরণী' },
      { id: 'dues_report', label: 'বোর্ডারভিত্তিক বকেয়া সারাংশ রিপোর্ট', desc: 'কার কত টাকা ভাড়া ও মেস বিল বকেয়া রয়েছে তার তালিকা' },
      { id: 'cash_report', label: 'ম্যানেজার ক্যাশ অডিট রিপোর্ট', desc: 'প্রতিদিনের ক্যাশ ক্লোজিং ও গরমিল অডিট স্টেটমেন্ট' },
      { id: 'meal_report', label: 'মাসিক মিল শিট ও খরচ রিপোর্ট', desc: 'বোর্ডারপ্রতি মোট মিল সংখ্যা ও মিল চার্জ সামারি' },
    ],
  },
  {
    id: 'governance',
    name: 'কর্মকর্তা ও পদবী ব্যবস্থাপনা',
    nameEn: 'Staff & Governance',
    category: 'governance',
    iconName: 'ShieldCheck',
    path: '/settings/users',
    options: [
      { id: 'view_staff', label: 'কর্মকর্তাদের তালিকা দেখা', desc: 'সকল স্টাফ ও ম্যানেজমেন্ট ইউজারের তালিকা দেখা' },
      { id: 'create_staff', label: 'নতুন কর্মকর্তা আইডি খোলা (Create Staff)', desc: 'ম্যানেজার, অ্যাকাউন্ট্যান্ট বা স্টাফদের জন্য নতুন আইডি তৈরি' },
      { id: 'change_role', label: 'পদবী ও রোল পরিবর্তন', desc: 'কর্মকর্তার পদবী (Manager, Accountant ইত্যাদি) পরিবর্তন করা' },
      { id: 'toggle_status', label: 'অ্যাকাউন্ট সক্রিয়/নিষ্ক্রিয় করা', desc: 'কর্মকর্তা চাকরি ত্যাগ করলে একাউন্ট বন্ধ করা' },
      { id: 'assign_flats', label: 'কর্মকর্তাকে ফ্ল্যাট বরাদ্দ করা', desc: 'ম্যানেজারের আওতায় কোন কোন ফ্ল্যাট থাকবে তা নির্ধারণ' },
    ],
  },
  {
    id: 'branding',
    name: 'হোস্টেল লোগো ও ব্র্যান্ডিং',
    nameEn: 'Hostel Branding & Logo',
    category: 'governance',
    iconName: 'Sparkles',
    path: '/settings/branding',
    options: [
      { id: 'view_branding', label: 'বর্তমান লোগো ও হোস্টেল নাম দেখা', desc: 'সফটওয়্যারে ব্যবহৃত লোগো ও ব্র্যান্ড নাম দেখা' },
      { id: 'edit_branding', label: 'লোগো আপলোড ও নাম পরিবর্তন', desc: 'নতুন লোগো ও হোস্টেলের নাম পরিবর্তন করা' },
    ],
  },
  {
    id: 'hostel_settings',
    name: 'হোস্টেল সেটিংস ও প্রোফাইল',
    nameEn: 'Hostel Settings & Profile',
    category: 'governance',
    iconName: 'Building2',
    path: '/settings/hostel',
    options: [
      { id: 'view_settings', label: 'হোস্টেল তথ্য ও প্রোফাইল দেখা', desc: 'হোস্টেলের নাম, ঠিকানা, হেল্পলাইন ও রুলস দেখা' },
      { id: 'edit_settings', label: 'হোস্টেল সেটিংস ও লোগো পরিবর্তন', desc: 'নতুন লোগো, ঠিকানা, নিয়মাবলী ও রশিদ ফুটার সম্পাদন' },
    ],
  },
  {
    id: 'notices',
    name: 'হোস্টেল নোটিশ ও ঘোষণা',
    nameEn: 'Hostel Notices & Announcements',
    category: 'governance',
    iconName: 'Megaphone',
    path: '/settings/notices',
    options: [
      { id: 'view_notices', label: 'নোটিশ ও ঘোষণা দেখা', desc: 'সকল সক্রিয় ও পূর্ববর্তী নোটিশের তালিকা দেখা' },
      { id: 'create_notice', label: 'নতুন নোটিশ তৈরি ও প্রচার', desc: 'সকল বা নির্দিষ্ট ফ্ল্যাটের জন্য নোটিশ পাঠানো' },
      { id: 'delete_notice', label: 'নোটিশ মুছে ফেলা', desc: 'পুরোনো বা অপ্রয়োজনীয় নোটিশ রিমুভ করা' },
    ],
  },
  {
    id: 'audit_logs',
    name: 'সিস্টেম অডিট ট্রেইল',
    nameEn: 'System Audit Logs',
    category: 'governance',
    iconName: 'ShieldAlert',
    path: '/settings/audit-logs',
    options: [
      { id: 'view_audit', label: 'পরিবর্তন ও ডিলিট অডিট লগ দেখা', desc: 'কে কখন কোন ভাউচার, রসিদ বা সিট বরাদ্দ পরিবর্তন করেছে তার ইতিহাস' },
    ],
  },
]

// Helper to build initial permission state
function buildDefaultPermissions(): AllRolesPermissions {
  const result: Partial<AllRolesPermissions> = {}

  // Helper to construct all options for a menu with default value
  const makeMenu = (menuId: string, enabled: boolean, enabledOptions?: string[]): MenuPermissionState => {
    const menuDef = ERP_MENU_DEFINITIONS.find((m) => m.id === menuId)
    const options: Record<string, boolean> = {}
    if (menuDef) {
      menuDef.options.forEach((opt) => {
        options[opt.id] = enabledOptions ? enabledOptions.includes(opt.id) : enabled
      })
    }
    return { enabled, options }
  }

  // 1. ADMIN (Almost all features enabled)
  result.ADMIN = {
    accommodations: makeMenu('accommodations', true),
    boarders: makeMenu('boarders', true),
    billing: makeMenu('billing', true),
    collections: makeMenu('collections', true),
    expenses: makeMenu('expenses', true),
    incomes: makeMenu('incomes', true),
    transfers: makeMenu('transfers', true),
    accounts: makeMenu('accounts', true),
    cashbook: makeMenu('cashbook', true),
    meals: makeMenu('meals', true),
    meal_settings: makeMenu('meal_settings', true),
    reports: makeMenu('reports', true),
    governance: makeMenu('governance', true),
    branding: makeMenu('branding', true),
    hostel_settings: makeMenu('hostel_settings', true),
    notices: makeMenu('notices', true),
    audit_logs: makeMenu('audit_logs', true),
  }

  // 2. MANAGER (Operational focus)
  result.MANAGER = {
    accommodations: makeMenu('accommodations', true),
    boarders: makeMenu('boarders', true),
    billing: makeMenu('billing', true, ['view_dues']),
    collections: makeMenu('collections', true, ['view_receipts', 'collect_rent', 'print_receipt']),
    expenses: makeMenu('expenses', true, ['view_expenses', 'create_expense']),
    incomes: makeMenu('incomes', true, ['view_incomes', 'create_income']),
    transfers: makeMenu('transfers', true, ['view_transfers', 'create_transfer']),
    accounts: makeMenu('accounts', true),
    cashbook: makeMenu('cashbook', true),
    meals: makeMenu('meals', true),
    meal_settings: makeMenu('meal_settings', true, ['view_settings']),
    reports: makeMenu('reports', true, ['dues_report', 'cash_report', 'meal_report']),
    governance: makeMenu('governance', false),
    branding: makeMenu('branding', false),
    hostel_settings: makeMenu('hostel_settings', true, ['view_settings']),
    notices: makeMenu('notices', true),
    audit_logs: makeMenu('audit_logs', false),
  }

  // 3. ACCOUNTANT (Financial focus)
  result.ACCOUNTANT = {
    accommodations: makeMenu('accommodations', true, ['view_matrix']),
    boarders: makeMenu('boarders', true, ['view_list', 'view_history']),
    billing: makeMenu('billing', true),
    collections: makeMenu('collections', true),
    expenses: makeMenu('expenses', true),
    incomes: makeMenu('incomes', true),
    transfers: makeMenu('transfers', true),
    accounts: makeMenu('accounts', true),
    cashbook: makeMenu('cashbook', true, ['view_cashbook']),
    meals: makeMenu('meals', false),
    meal_settings: makeMenu('meal_settings', true, ['view_settings']),
    reports: makeMenu('reports', true),
    governance: makeMenu('governance', false),
    branding: makeMenu('branding', false),
    hostel_settings: makeMenu('hostel_settings', true, ['view_settings']),
    notices: makeMenu('notices', true, ['view_notices']),
    audit_logs: makeMenu('audit_logs', true, ['view_audit']),
  }

  // 4. MEAL_OPERATOR (Kitchen focus)
  result.MEAL_OPERATOR = {
    accommodations: makeMenu('accommodations', false),
    boarders: makeMenu('boarders', false),
    billing: makeMenu('billing', false),
    collections: makeMenu('collections', false),
    expenses: makeMenu('expenses', false),
    incomes: makeMenu('incomes', false),
    transfers: makeMenu('transfers', false),
    accounts: makeMenu('accounts', false),
    cashbook: makeMenu('cashbook', false),
    meals: makeMenu('meals', true),
    meal_settings: makeMenu('meal_settings', true, ['view_settings']),
    reports: makeMenu('reports', false),
    governance: makeMenu('governance', false),
    branding: makeMenu('branding', false),
    hostel_settings: makeMenu('hostel_settings', false),
    notices: makeMenu('notices', false),
    audit_logs: makeMenu('audit_logs', false),
  }

  // 5. AUDITOR (Read-only compliance)
  result.AUDITOR = {
    accommodations: makeMenu('accommodations', true, ['view_matrix']),
    boarders: makeMenu('boarders', true, ['view_list', 'view_history']),
    billing: makeMenu('billing', true, ['view_dues']),
    collections: makeMenu('collections', true, ['view_receipts', 'print_receipt']),
    expenses: makeMenu('expenses', true, ['view_expenses']),
    incomes: makeMenu('incomes', true, ['view_incomes']),
    transfers: makeMenu('transfers', true, ['view_transfers']),
    accounts: makeMenu('accounts', true, ['view_accounts', 'view_ledger']),
    cashbook: makeMenu('cashbook', true, ['view_cashbook']),
    meals: makeMenu('meals', true, ['kitchen_board']),
    meal_settings: makeMenu('meal_settings', true, ['view_settings']),
    reports: makeMenu('reports', true),
    governance: makeMenu('governance', false),
    branding: makeMenu('branding', false),
    hostel_settings: makeMenu('hostel_settings', true, ['view_settings']),
    notices: makeMenu('notices', true, ['view_notices']),
    audit_logs: makeMenu('audit_logs', true, ['view_audit']),
  }

  return result as AllRolesPermissions
}

export const DEFAULT_ROLE_PERMISSIONS: AllRolesPermissions = buildDefaultPermissions()

const STORAGE_KEY = 'bachelor_erp_role_permissions'

interface AccessControlState {
  rolePermissions: AllRolesPermissions
  activeRole: ConfigurableRole
  isLoading: boolean
  isSaved: boolean

  setActiveRole: (role: ConfigurableRole) => void
  toggleMenu: (role: ConfigurableRole, menuId: string, enabled?: boolean) => void
  toggleOption: (role: ConfigurableRole, menuId: string, optionId: string, enabled?: boolean) => void
  toggleAllForMenu: (role: ConfigurableRole, menuId: string, enabled: boolean) => void
  toggleAllForRole: (role: ConfigurableRole, enabled: boolean) => void
  resetRoleToDefault: (role: ConfigurableRole) => void
  resetAllToDefault: () => void
  savePermissions: () => Promise<void>
  initializePermissions: () => Promise<void>
  hasMenuAccess: (role: string, menuId: string) => boolean
  hasOptionAccess: (role: string, menuId: string, optionId: string) => boolean
}

export const useAccessControlStore = create<AccessControlState>((set, get) => ({
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,
  activeRole: 'ADMIN',
  isLoading: false,
  isSaved: false,

  setActiveRole: (role) => set({ activeRole: role, isSaved: false }),

  toggleMenu: (role, menuId, explicitValue) => {
    set((state) => {
      const currentRole = state.rolePermissions[role] || {}
      const currentMenu = currentRole[menuId] || { enabled: false, options: {} }
      const newEnabled = explicitValue !== undefined ? explicitValue : !currentMenu.enabled

      // If disabling menu, optionally keep or disable sub-options. If enabling and options empty, enable all
      const updatedOptions = { ...(currentMenu.options || {}) }
      if (newEnabled) {
        // If enabling menu and all options were false, enable all options
        const allOff = Object.values(updatedOptions).every((v) => !v)
        if (allOff) {
          const menuDef = ERP_MENU_DEFINITIONS.find((m) => m.id === menuId)
          menuDef?.options.forEach((opt) => {
            updatedOptions[opt.id] = true
          })
        }
      }

      return {
        rolePermissions: {
          ...state.rolePermissions,
          [role]: {
            ...currentRole,
            [menuId]: {
              enabled: newEnabled,
              options: updatedOptions,
            },
          },
        },
        isSaved: false,
      }
    })
  },

  toggleOption: (role, menuId, optionId, explicitValue) => {
    set((state) => {
      const currentRole = state.rolePermissions[role] || {}
      const currentMenu = currentRole[menuId] || { enabled: false, options: {} }
      const currentOptions = currentMenu.options || {}
      const newOptionVal = explicitValue !== undefined ? explicitValue : !currentOptions[optionId]

      const updatedOptions = {
        ...currentOptions,
        [optionId]: newOptionVal,
      }

      // If at least one option is turned on, ensure menu is also enabled
      const hasAnyEnabled = Object.values(updatedOptions).some((v) => v === true)
      const menuEnabled = hasAnyEnabled ? true : currentMenu.enabled

      return {
        rolePermissions: {
          ...state.rolePermissions,
          [role]: {
            ...currentRole,
            [menuId]: {
              enabled: menuEnabled,
              options: updatedOptions,
            },
          },
        },
        isSaved: false,
      }
    })
  },

  toggleAllForMenu: (role, menuId, enabled) => {
    set((state) => {
      const currentRole = state.rolePermissions[role] || {}
      const menuDef = ERP_MENU_DEFINITIONS.find((m) => m.id === menuId)
      const options: Record<string, boolean> = {}
      if (menuDef) {
        menuDef.options.forEach((opt) => {
          options[opt.id] = enabled
        })
      }

      return {
        rolePermissions: {
          ...state.rolePermissions,
          [role]: {
            ...currentRole,
            [menuId]: {
              enabled,
              options,
            },
          },
        },
        isSaved: false,
      }
    })
  },

  toggleAllForRole: (role, enabled) => {
    set((state) => {
      const updatedMenus: RolePermissionsMap = {}
      ERP_MENU_DEFINITIONS.forEach((menuDef) => {
        const options: Record<string, boolean> = {}
        menuDef.options.forEach((opt) => {
          options[opt.id] = enabled
        })
        updatedMenus[menuDef.id] = {
          enabled,
          options,
        }
      })

      return {
        rolePermissions: {
          ...state.rolePermissions,
          [role]: updatedMenus,
        },
        isSaved: false,
      }
    })
  },

  resetRoleToDefault: (role) => {
    set((state) => ({
      rolePermissions: {
        ...state.rolePermissions,
        [role]: JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role])),
      },
      isSaved: false,
    }))
  },

  resetAllToDefault: () => {
    set({
      rolePermissions: JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)),
      isSaved: false,
    })
  },

  savePermissions: async () => {
    set({ isLoading: true })
    const { rolePermissions } = get()

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rolePermissions))
    } catch (e) {
      console.warn('Failed to save permissions to localStorage:', e)
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('organization_settings').upsert({
          org_name: 'Bachelor Home',
          access_control_permissions: rolePermissions,
          updated_at: new Date().toISOString(),
        })
      } catch {
        // Table or column might not exist, silently continue with localStorage
      }
    }

    set({ isLoading: false, isSaved: true })
  },

  initializePermissions: async () => {
    const mergePermissions = (base: AllRolesPermissions, override: Partial<AllRolesPermissions>): AllRolesPermissions => {
      const result: AllRolesPermissions = { ...base }
        ; (Object.keys(base) as ConfigurableRole[]).forEach((role) => {
          if (override[role]) {
            result[role] = { ...base[role], ...override[role] }
          }
        })
      return result
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        set((state) => ({ rolePermissions: mergePermissions(state.rolePermissions, parsed) }))
      }
    } catch (e) {
      console.warn('Failed to parse local permissions:', e)
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('organization_settings')
          .select('access_control_permissions')
          .maybeSingle()

        if (!error && data?.access_control_permissions) {
          const remotePerms = data.access_control_permissions as AllRolesPermissions
          set((state) => ({ rolePermissions: mergePermissions(state.rolePermissions, remotePerms) }))
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remotePerms))
        }
      } catch {
        // Fallback gracefully
      }
    }
  },

  hasMenuAccess: (role, menuId) => {
    if (role === 'SUPER_ADMIN') return true
    if (!['ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR'].includes(role)) {
      return false
    }
    const state = get()
    const roleMap = state.rolePermissions[role as ConfigurableRole]
    let targetKey = menuId
    if (!roleMap?.[targetKey]) {
      if (menuId === 'branding' && roleMap?.['hostel_settings']) {
        targetKey = 'hostel_settings'
      } else if (menuId === 'hostel_settings' && roleMap?.['branding']) {
        targetKey = 'branding'
      }
    }
    if (!roleMap || !roleMap[targetKey]) {
      const def = DEFAULT_ROLE_PERMISSIONS[role as ConfigurableRole]
      return def?.[targetKey]?.enabled ?? (targetKey === 'hostel_settings' ? (def?.['branding']?.enabled ?? true) : false)
    }
    return Boolean(roleMap[targetKey].enabled)
  },

  hasOptionAccess: (role, menuId, optionId) => {
    if (role === 'SUPER_ADMIN') return true
    if (!['ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR'].includes(role)) {
      return false
    }
    const state = get()
    const roleMap = state.rolePermissions[role as ConfigurableRole]
    let targetKey = menuId
    if (!roleMap?.[targetKey]) {
      if (menuId === 'branding' && roleMap?.['hostel_settings']) {
        targetKey = 'hostel_settings'
      } else if (menuId === 'hostel_settings' && roleMap?.['branding']) {
        targetKey = 'branding'
      }
    }
    const menuState = roleMap?.[targetKey] || DEFAULT_ROLE_PERMISSIONS[role as ConfigurableRole]?.[targetKey]
    if (!menuState || !menuState.enabled) return false
    if (menuState.options && menuState.options[optionId] !== undefined) {
      return Boolean(menuState.options[optionId])
    }
    return DEFAULT_ROLE_PERMISSIONS[role as ConfigurableRole]?.[targetKey]?.options?.[optionId] ?? false
  },
}))
