import type { ReportDefinition, ReportCategory } from './types'

export const REPORT_CATEGORIES: { id: ReportCategory; titleEn: string; titleBn: string }[] = [
  {
    id: 'FINANCIAL',
    titleEn: 'Financial Statements & P&L',
    titleBn: 'আর্থিক বিবরণী ও লাভ-ক্ষতি',
  },
  {
    id: 'CASH_CUSTODY',
    titleEn: 'Cash Custody & Ledger Audit',
    titleBn: 'ক্যাশ তহবিল ও লেজার অডিট',
  },
  {
    id: 'BOARDER_OPERATIONS',
    titleEn: 'Boarders & Security Deposits',
    titleBn: 'বর্ডার বকেয়া ও জামানত',
  },
  {
    id: 'COMPLIANCE_AUDIT',
    titleEn: 'Compliance, Voids & Staff Performance',
    titleBn: 'কমপ্লায়েন্স, বাতিল ও স্টাফ পারফরম্যান্স',
  },
]

export const ALL_REPORTS: ReportDefinition[] = [
  // 1. Daily Income & Expense Report
  {
    id: 'DAILY_INCOME_EXPENSE',
    category: 'FINANCIAL',
    titleEn: 'Daily Income & Expense Report',
    titleBn: 'দৈনিক আয় ও ব্যয় বিবরণী',
    descriptionEn: 'Day-wise categorized receipts, non-rent incomes, operating expenses, and net daily cashflow.',
    descriptionBn: 'প্রতিদিনের আদায়কৃত ভাড়া, অন্যান্য আয়, খরচ এবং দিনভিত্তিক নিট ব্যালেন্স।',
    icon: 'Calendar',
  },
  // 2. Weekly Income & Expense Report
  {
    id: 'WEEKLY_INCOME_EXPENSE',
    category: 'FINANCIAL',
    titleEn: 'Weekly Income & Expense Report',
    titleBn: 'সাপ্তাহিক আয় ও ব্যয় বিবরণী',
    descriptionEn: 'Week-by-week aggregated revenue and operating expenditures with net operating margin.',
    descriptionBn: 'সপ্তাহভিত্তিক সমন্বিত আয় ও ব্যয়ের তুলনামূলক পর্যালোচনা।',
    icon: 'TrendingUp',
  },
  // 3. Monthly Operating Statement
  {
    id: 'MONTHLY_OPERATING_STATEMENT',
    category: 'FINANCIAL',
    titleEn: 'Monthly Operating Statement (P&L)',
    titleBn: 'মাসিক লাভ-ক্ষতি স্টেটমেন্ট (P&L)',
    descriptionEn: 'Comprehensive monthly P&L: Rent & utility revenue, breakdown of operating expenses & net margin.',
    descriptionBn: 'মাসের সামগ্রিক ভাড়া আদায়, ইউটিলিটি, বাজার ও রক্ষনাবেক্ষণ খরচ এবং মোট পরিচালন মুনাফা।',
    icon: 'FileText',
  },
  // 4. Receipt-wise Collection Report
  {
    id: 'RECEIPT_COLLECTION',
    category: 'FINANCIAL',
    titleEn: 'Receipt-wise Collection Report',
    titleBn: 'রসিদভিত্তিক আদায় রেজিস্টার',
    descriptionEn: 'Granular receipt log filterable by date, collector manager, building, and payment method.',
    descriptionBn: 'তারিখ, কালেক্টর ম্যানেজার ও পেমেন্ট মেথড অনুযায়ী বিস্তারিত মানি রসিদ রেজিস্টার।',
    icon: 'Receipt',
  },
  // 5. Expense Category Analysis
  {
    id: 'EXPENSE_CATEGORY_ANALYSIS',
    category: 'FINANCIAL',
    titleEn: 'Expense Category Analysis',
    titleBn: 'ব্যয় খাতভিত্তিক বিশ্লেষণ',
    descriptionEn: 'Detailed distribution of expenses across categories (Utilities, Gas, Cook, Groceries, WiFi).',
    descriptionBn: 'ইউটিলিটি, বাবুর্চি, গ্যাস, ওয়াইফাই ও বাজার খরচের বিস্তারিত খাতভিত্তিক বণ্টন।',
    icon: 'PieChart',
  },
  // 6. Flat-wise Expense Report
  {
    id: 'FLAT_EXPENSES',
    category: 'FINANCIAL',
    titleEn: 'Flat-wise Expense Report',
    titleBn: 'ফ্ল্যাটভিত্তিক খরচ ও মেরামত বিবরণী',
    descriptionEn: 'Breakdown of maintenance, utility, and operating costs allocated directly to specific flats.',
    descriptionBn: 'নির্দিষ্ট ফ্ল্যাট অনুযায়ী মেরামত, বিল ও রক্ষণাবেক্ষণ খরচের বিস্তারিত বিবরণী।',
    icon: 'Building2',
  },

  // 7. Cash Ledger & Bank/MFS Account Ledger
  {
    id: 'ACCOUNT_LEDGERS',
    category: 'CASH_CUSTODY',
    titleEn: 'Account Ledger (Cash, Bank & MFS)',
    titleBn: 'অ্যাকাউন্ট লেজার (ক্যাশ, ব্যাংক ও বিকাশ)',
    descriptionEn: 'Chronological double-entry debits, credits, and running balance across all system accounts.',
    descriptionBn: 'ম্যানেজার ক্যাশ, ওনার ফান্ড, ব্যাংক ও বিকাশ অ্যাকাউন্টের সম্পূর্ণ চলমান খতিয়ান।',
    icon: 'BookOpen',
  },
  // 8. Manager-wise Daily Cash Report
  {
    id: 'MANAGER_DAILY_CASH',
    category: 'CASH_CUSTODY',
    titleEn: 'Manager-wise Daily Cash Report',
    titleBn: 'ম্যানেজারভিত্তিক দৈনিক ক্যাশ রিপোর্ট',
    descriptionEn: 'Opening cash, collections, expenses, owner deposits, and handovers tracked per manager.',
    descriptionBn: 'প্রতিটি ম্যানেজারের সকালের প্রারম্ভিক ক্যাশ, আদায়, ব্যয় ও সমাপনী স্থিতির হিসাব।',
    icon: 'UserCheck',
  },
  // 9. Daily Cash Closing & Reconciliation Report
  {
    id: 'DAILY_CASH_CLOSING',
    category: 'CASH_CUSTODY',
    titleEn: 'Daily Cash Closing & Reconciliation',
    titleBn: 'দৈনিক ক্যাশ ক্লোজিং ও রিকনসিলিয়েশন',
    descriptionEn: 'Audit log of submitted manager daily cash closing sessions and verification statuses.',
    descriptionBn: 'ম্যানেজারদের দৈনিক ক্যাশ কাউন্ট জমা এবং অনুমোদন/রিভিউ হিস্টোরি।',
    icon: 'CheckCircle2',
  },
  // 10. Manager Expected vs Actual Cash & Variance Report
  {
    id: 'CASH_VARIANCE_AUDIT',
    category: 'CASH_CUSTODY',
    titleEn: 'Expected vs Actual Cash & Variance Report',
    titleBn: 'ক্যাশ ঘাটতি ও অমিল (Variance) অডিট',
    descriptionEn: 'Audit report of all non-zero variances between physical counted cash and system calculations.',
    descriptionBn: 'কাউন্টিং ক্যাশ ও সিস্টেম হিসেবের মধ্যে ঘাটতি বা অতিরিক্ত টাকার বিস্তারিত অডিট।',
    icon: 'AlertTriangle',
  },
  // 11. Owner Deposit Report
  {
    id: 'OWNER_DEPOSITS',
    category: 'CASH_CUSTODY',
    titleEn: 'Owner Deposit Report',
    titleBn: 'মালিককে জমাকৃত টাকা বিবরণী',
    descriptionEn: 'Log of all cash deposits transferred from managers to owner accounts with proofs & confirmation.',
    descriptionBn: 'ম্যানেজার থেকে হোস্টেল মালিকের ব্যাংক/ক্যাশে জমাকৃত টাকার প্রমাণ ও অনুমোদন রিপোর্ট।',
    icon: 'ArrowUpRight',
  },
  // 12. Cash Handover Report
  {
    id: 'CASH_HANDOVERS',
    category: 'CASH_CUSTODY',
    titleEn: 'Cash Handover Report',
    titleBn: 'ক্যাশ হ্যান্ডওভার ও হস্তান্তর রেজিস্টার',
    descriptionEn: 'Custodian-to-custodian cash handovers between shift managers with 2-party confirmations.',
    descriptionBn: 'এক ম্যানেজারের হাত থেকে অন্য ম্যানেজারের কাছে ক্যাশ হস্তান্তরের সম্পূর্ণ ট্রেইল।',
    icon: 'ArrowRightLeft',
  },

  // 13. Boarder Ledger & Dues Aging Report
  {
    id: 'BOARDER_DUES_AGING',
    category: 'BOARDER_OPERATIONS',
    titleEn: 'Boarder Ledger & Dues Aging Report',
    titleBn: 'বর্ডার বকেয়া ও বয়সভিত্তিক লেজার',
    descriptionEn: 'Billed, collected, outstanding dues, and 0-30, 31-60, 61-90, 90+ days aging buckets.',
    descriptionBn: 'বর্ডারদের মোট বিল, পরিশোধ, বর্তমান বকেয়া এবং ৩০/৬০/৯০+ দিনের পুরাতন বকেয়ার হিসাব।',
    icon: 'Clock',
  },
  // 14. Security Deposit Report
  {
    id: 'SECURITY_DEPOSITS',
    category: 'BOARDER_OPERATIONS',
    titleEn: 'Security Deposit Report',
    titleBn: 'সিকিউরিটি জামানত স্থিতি ও রিফান্ড রিপোর্ট',
    descriptionEn: 'Security deposits billed, collected, held in reserve, and refunded upon checkout.',
    descriptionBn: 'বর্ডারদের নিকট থেকে প্রাপ্ত জামানত, বর্তমানে সংরক্ষিত ফান্ড এবং রিফান্ড স্ট্যাটাস।',
    icon: 'Shield',
  },

  // 15. Receipt Void & Reversal Audit Report
  {
    id: 'RECEIPT_VOID_AUDIT',
    category: 'COMPLIANCE_AUDIT',
    titleEn: 'Receipt Void & Reversal Audit Report',
    titleBn: 'বাতিলকৃত মানি রসিদ অডিট রিপোর্ট',
    descriptionEn: 'Audit trail of all voided receipts, void authorizers, cancellation timestamps, and reasons.',
    descriptionBn: 'সিস্টেমে ভুল বা জালিয়াতি রোধে বাতিলকৃত রসিদ, বাতিলের কারণ ও কর্মকর্তার নাম।',
    icon: 'Trash2',
  },
  // 16. Manager Performance & Compliance Report
  {
    id: 'MANAGER_COMPLIANCE',
    category: 'COMPLIANCE_AUDIT',
    titleEn: 'Manager Performance & Compliance Report',
    titleBn: 'ম্যানেজার দক্ষতা ও কমপ্লায়েন্স স্কোরকার্ড',
    descriptionEn: 'Collection efficiency, timely daily closing percentage, variance rate, and custody ratings.',
    descriptionBn: 'আদায় কার্যকারিতা, সময়মতো ক্যাশ ক্লোজিং, ভ্যারিয়েন্সের হার এবং স্টাফ নির্ভরযোগ্যতা।',
    icon: 'Award',
  },
]
