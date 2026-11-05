import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  X,
  Receipt,
  Calendar,
  Building2,
  Wallet,
  Camera,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  Plus,
  ShoppingCart,
  Layers,
  Store,
} from 'lucide-react'
import { ManageCategoriesModal } from '@/features/finance/components/ManageCategoriesModal'
import {
  useExpenseCategories,
  useExpenseAccounts,
  useExpenseFlats,
  useRecordExpenseMutation,
  type RecordExpenseInput,
} from '../api/useExpenses'
import { useAuthStore } from '@/app/store/useAuthStore'
import type { ExpenseScope } from '@/types/database'
import { compressVoucherImage } from '@/utils/imageCompression'

const DRAFT_KEY = 'bachelor_expense_modal_draft_v2'
const MODAL_OPEN_KEY = 'bachelor_expense_modal_open_v2'

function getSavedDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
}

const SCOPE_CONFIG: {
  scope: ExpenseScope
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  activeClass: string
}[] = [
  {
    scope: 'HOSTEL_MARKET',
    title: '১. হোস্টেলের বাজার খরচ',
    subtitle: 'মেস মিল বাজার, মাছ, মাংস ও কাঁচাবাজার',
    icon: ShoppingCart,
    activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-2 ring-emerald-500/30',
  },
  {
    scope: 'HOSTEL_MISC',
    title: '২. হোস্টেলের বিবিধ খরচ',
    subtitle: 'বাবুর্চি বেতন, স্টাফ, অফিস ও কেন্দ্রীয় মেরামত',
    icon: Layers,
    activeClass: 'border-indigo-500 bg-indigo-500/10 text-indigo-300 ring-2 ring-indigo-500/30',
  },
  {
    scope: 'FLAT_MISC',
    title: '৩. ফ্ল্যাটওয়ারী বিবিধ খরচ',
    subtitle: 'বিদ্যুৎ, পানি, গ্যাস ও ফ্ল্যাট মেরামত (সিটভিত্তিক বণ্টন)',
    icon: Building2,
    activeClass: 'border-amber-500 bg-amber-500/10 text-amber-300 ring-2 ring-amber-500/30',
  },
]

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: categories = [] } = useExpenseCategories()
  const { data: accounts = [] } = useExpenseAccounts()
  const { data: flats = [] } = useExpenseFlats()
  const recordMutation = useRecordExpenseMutation()

  const savedDraft = useMemo(() => getSavedDraft(), [])

  // Form State (restored from draft if available)
  const [selectedScope, setSelectedScope] = useState<ExpenseScope>(
    savedDraft?.selectedScope || 'HOSTEL_MARKET'
  )
  const [expenseDate, setExpenseDate] = useState<string>(
    savedDraft?.expenseDate || new Date().toISOString().slice(0, 10)
  )
  const [billingMonth, setBillingMonth] = useState<string>(
    savedDraft?.billingMonth || new Date().toISOString().slice(0, 7)
  )
  const [categoryId, setCategoryId] = useState<string>(savedDraft?.categoryId || '')
  const [amount, setAmount] = useState<string>(savedDraft?.amount || '')
  const [sourceAccountId, setSourceAccountId] = useState<string>(savedDraft?.sourceAccountId || '')
  const [flatId, setFlatId] = useState<string>(savedDraft?.flatId || '')
  const [vendorName, setVendorName] = useState<string>(savedDraft?.vendorName || '')
  const [description, setDescription] = useState<string>(savedDraft?.description || '')

  // Voucher File & Preview State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ voucherNo: string } | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false)

  // Persist draft while user types
  useEffect(() => {
    if (!isOpen) return
    const draft = {
      selectedScope,
      expenseDate,
      billingMonth,
      categoryId,
      amount,
      sourceAccountId,
      flatId,
      vendorName,
      description,
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {}
  }, [
    isOpen,
    selectedScope,
    expenseDate,
    billingMonth,
    categoryId,
    amount,
    sourceAccountId,
    flatId,
    vendorName,
    description,
  ])

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(MODAL_OPEN_KEY)
    } catch {}
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // In-App Live Camera Viewfinder State
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const handleStartCamera = async () => {
    setErrorMsg(null)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current?.click()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      streamRef.current = stream
      setIsLiveCameraOpen(true)
    } catch (err: any) {
      console.warn('getUserMedia failed, falling back to camera input:', err)
      stopCameraStream()
      cameraInputRef.current?.click()
    }
  }

  // Bind stream to video element when live camera opens
  useEffect(() => {
    if (isLiveCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch((err) => {
        console.warn('Video playback error:', err)
      })
    }
  }, [isLiveCameraOpen])

  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [])

  const handleCapturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `voucher_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })

        processSelectedFile(file)
        stopCameraStream()
        setIsLiveCameraOpen(false)
      },
      'image/jpeg',
      0.85
    )
  }

  const handleCloseLiveCamera = () => {
    stopCameraStream()
    setIsLiveCameraOpen(false)
  }

  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN'

  // Filter accounts belonging to manager
  const managerAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (profile?.id && a.assigned_manager_id === profile.id) return true
      if (a.account_type === 'CASH_MANAGER') return true
      const name = a.account_name.toLowerCase()
      if (name.includes('manager') || a.account_name.includes('ম্যানেজার')) return true
      return false
    })
  }, [accounts, profile?.id])

  // For Managers: ONLY manager accounts are accessible ("অন্য একাউন্ট তার এখানে আসবে না")
  // For Admins/SuperAdmins: all accounts are accessible
  const availableAccounts = useMemo(() => {
    if (isAdmin) return accounts
    return managerAccounts.length > 0 ? managerAccounts : accounts
  }, [isAdmin, accounts, managerAccounts])

  // Filter categories by selected scope
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.category_scope) {
        return c.category_scope === selectedScope
      }
      // If legacy or untagged, keep under general or misc
      return selectedScope === 'HOSTEL_MISC'
    })
  }, [categories, selectedScope])

  // Select first available category when scope changes
  useEffect(() => {
    if (filteredCategories.length > 0) {
      if (!categoryId || !filteredCategories.some((c) => c.id === categoryId)) {
        setCategoryId(filteredCategories[0].id)
      }
    } else {
      setCategoryId('')
    }
  }, [filteredCategories, categoryId])

  // Default account selection restricted to availableAccounts
  useEffect(() => {
    if (availableAccounts.length > 0) {
      if (!sourceAccountId || !availableAccounts.some((a) => a.id === sourceAccountId)) {
        setSourceAccountId(availableAccounts[0].id)
      }
    }
  }, [availableAccounts, sourceAccountId])

  // Default flat selection when FLAT_MISC is selected
  useEffect(() => {
    if (selectedScope === 'FLAT_MISC' && flats.length > 0 && !flatId) {
      setFlatId(flats[0].id)
    }
  }, [selectedScope, flats, flatId])

  if (!isOpen) return null

  // Handle file processing with automatic client-side compression
  const processSelectedFile = async (rawFile: File) => {
    setErrorMsg(null)
    setIsCompressing(true)
    try {
      // Compress large smartphone camera photos (e.g. 15MB down to ~300KB-500KB)
      const file = await compressVoucherImage(rawFile)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('ফাইল সাইজ সর্বোচ্চ ১০ মেগাবাইট (10MB) পর্যন্ত হতে পারবে।')
        return
      }

      setSelectedFile(file)
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }
    } catch (err: any) {
      console.warn('Image compression fallback:', err)
      setSelectedFile(rawFile)
      if (rawFile.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(rawFile))
      }
    } finally {
      setIsCompressing(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processSelectedFile(file)
    }
    // Reset input value so selecting the same file again fires onChange
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processSelectedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    const fileEl = document.getElementById('expense-voucher-file') as HTMLInputElement | null
    if (fileEl) fileEl.value = ''
    const camEl = document.getElementById('expense-voucher-camera') as HTMLInputElement | null
    if (camEl) camEl.value = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const selectedAccount = accounts.find((a) => a.id === sourceAccountId)
  const parsedAmount = parseFloat(amount) || 0
  const remainingBalance = selectedAccount ? selectedAccount.current_balance - parsedAmount : 0

  const selectedFlat = flats.find((f: any) => f.id === flatId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!categoryId) {
      setErrorMsg('ব্যয়ের খাত নির্বাচন করা আবশ্যক।')
      return
    }

    if (!amount || parsedAmount <= 0) {
      setErrorMsg('সঠিক ব্যয়ের পরিমাণ (টাকা) প্রদান করুন।')
      return
    }

    if (!sourceAccountId) {
      setErrorMsg('পরিশোধের একাউন্ট নির্বাচন করুন।')
      return
    }

    if (!isAdmin && !managerAccounts.some((a) => a.id === sourceAccountId)) {
      setErrorMsg('ম্যানেজার শুধুমাত্র নিজের ম্যানেজার ক্যাশ একাউন্ট থেকেই খরচ এন্ট্রি করতে পারবেন।')
      return
    }

    if (selectedScope === 'FLAT_MISC' && !flatId) {
      setErrorMsg('ফ্ল্যাটওয়ারী বিবিধ খরচের ক্ষেত্রে ফ্ল্যাট নির্বাচন করা আবশ্যক।')
      return
    }

    if (!description.trim()) {
      setErrorMsg('খরচের সুনির্দিষ্ট বিবরণ উল্লেখ করুন।')
      return
    }

    try {
      const payload: RecordExpenseInput = {
        expenseScope: selectedScope,
        categoryId,
        amount: parsedAmount,
        sourceAccountId,
        buildingId: selectedScope === 'FLAT_MISC' && selectedFlat ? selectedFlat.building_id : null,
        flatId: selectedScope === 'FLAT_MISC' ? flatId : null,
        expenseDate,
        billingMonth: selectedScope === 'FLAT_MISC' ? `${billingMonth}-01` : null,
        vendorName: vendorName.trim() || null,
        description: description.trim(),
        voucherFile: selectedFile,
      }

      const res = await recordMutation.mutateAsync(payload)
      setSuccessInfo({ voucherNo: res.expense_voucher_no || res.voucher_number || 'EXP-CREATED' })
      clearDraft()

      setTimeout(() => {
        setSuccessInfo(null)
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'খরচ সংরক্ষণ করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 p-0.5 shadow-lg shadow-rose-600/30 flex items-center justify-center text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                খরচ ভাউচার এন্ট্রি (Simplified Expense Entry)
              </h3>
              <p className="text-xs text-slate-400">
                ৩টি নির্ধারিত ক্যাটাগরিতে হোস্টেলের সকল খরচের নির্ভুল এন্ট্রি
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearDraft()
              onClose()
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Success Message Banner */}
          {successInfo && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-fade-in">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">
                  খরচ সফলভাবে এন্ট্রি ও একাউন্ট সমন্বয় হয়েছে!
                </p>
                <p className="text-xs text-emerald-400/80">
                  ভাউচার নম্বর: <span className="font-mono font-bold text-white">{successInfo.voucherNo}</span>
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 3-Tier Expense Category Scope Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 block">
              খরচের মূল ক্যাটাগরি নির্বাচন করুন <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SCOPE_CONFIG.map((item) => {
                const IconComponent = item.icon
                const isSelected = selectedScope === item.scope
                return (
                  <button
                    key={item.scope}
                    type="button"
                    onClick={() => setSelectedScope(item.scope)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? item.activeClass
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">{item.title}</span>
                    </div>
                    <span className="text-[10px] leading-tight text-slate-400">
                      {item.subtitle}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sub-category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sub-Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                  খরচের খাত / সাব-ক্যাটাগরি <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>নতুন খাত</span>
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                {filteredCategories.length === 0 ? (
                  <option value="" disabled>এই ক্যাটাগরিতে কোনো খাত তৈরি করা নেই</option>
                ) : (
                  filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Expense Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                খরচের তারিখ <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Conditional Flat-Wise Section */}
          {selectedScope === 'FLAT_MISC' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
              <div className="flex items-start gap-2.5 text-amber-300 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">ফ্ল্যাটওয়ারী বিবিধ খরচের হিসাব নীতি:</p>
                  <p className="text-[11px] text-amber-200/80">
                    এই খরচটি সংশ্লিষ্ট ফ্ল্যাটের <strong>মোট সিট সংখ্যা (Total Seats)</strong> দিয়ে সমভাবে ভাগ হবে (বর্ডারের সংখ্যা দিয়ে নয়)।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-500/20">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200">
                    সংশ্লিষ্ট ফ্ল্যাট নির্বাচন করুন <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={flatId}
                    onChange={(e) => setFlatId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">ফ্ল্যাট নির্বাচন করুন...</option>
                    {flats.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.flat_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200">
                    বণ্টনের বিলিং মাস <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="month"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Amount & Source Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>মোট ব্যয়ের পরিমাণ (BDT) <span className="text-rose-400">*</span></span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  ৳
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="০.০০"
                  required
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white font-mono text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-600"
                />
              </div>
            </div>

            {/* Source Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                  যে অ্যাকাউন্ট থেকে প্রদান করা হয়েছে <span className="text-rose-400">*</span>
                </span>
                <div className="flex items-center gap-2">
                  {!isAdmin && (
                    <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md font-medium">
                      ম্যানেজার ক্যাশ নির্ধারিত
                    </span>
                  )}
                  {selectedAccount && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      ব্যালেন্স: ৳{selectedAccount.current_balance.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                required
                disabled={!isAdmin && availableAccounts.length === 1}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-90 disabled:cursor-not-allowed"
              >
                {availableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name} — ৳{a.current_balance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Balance Deduction Snippet */}
          {selectedAccount && parsedAmount > 0 && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
              remainingBalance < 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-indigo-950/30 border-indigo-500/20 text-indigo-300'
            }`}>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  {selectedAccount.account_name} ব্যালেন্স কর্তন:
                </span>
              </div>
              <div className="font-mono font-semibold">
                ৳{selectedAccount.current_balance.toLocaleString('en-IN')} − ৳{parsedAmount.toLocaleString('en-IN')} ={' '}
                <span className={remainingBalance < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  ৳{remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Vendor Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              ভেন্ডার / দোকানের নাম (যদি থাকে)
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="যেমন: কারওয়ান বাজার আড়ত, ভাই ভাই হার্ডওয়্যার, ডেসকো"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              খরচের বিস্তারিত বিবরণ <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="উদাঃ মেস মিলের জন্য চাল ২ বস্তা ও তেল ১০ লিটার ক্রয়..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Voucher File Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>ক্যাশ মেমো / ভাউচার সংযুক্তি (ছবি বা পিডিএফ)</span>
              <span className="text-[10px] text-slate-500">ঐচ্ছিক</span>
            </label>

            {/* Native Hidden File Inputs */}
            <input
              id="expense-voucher-file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="sr-only"
            />
            <input
              id="expense-voucher-camera"
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="sr-only"
            />

            {isCompressing ? (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center gap-3 text-indigo-300 text-xs font-semibold animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>ভাউচারের ছবি অপটিমাইজ ও কম্প্রেস করা হচ্ছে...</span>
              </div>
            ) : selectedFile ? (
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 flex items-center justify-between gap-3 animate-fade-in shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Voucher preview"
                      className="w-12 h-12 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type.includes('pdf') ? 'PDF ভাউচার' : 'ছবি সংযুক্তি (অপটিমাইজড)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="ফাইল মুছুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-950/40 ring-2 ring-indigo-500/30'
                    : 'border-slate-700/80 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950/80'
                }`}
              >
                <div className="flex justify-center gap-3 mb-1.5 text-slate-400">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <Camera className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs font-semibold text-slate-200 mb-0.5">
                  এখানে ফাইল ড্রপ করুন অথবা নিচের যেকোনো অপশন ব্যবহার করুন
                </p>
                <p className="text-[10px] text-slate-400 mb-3">
                  (সর্বোচ্চ সাইজ ১০ MB — JPG, PNG ছবি বা PDF ফরম্যাট)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem(MODAL_OPEN_KEY, 'true')
                      } catch {}
                      fileInputRef.current?.click()
                    }}
                    className="p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/90 hover:bg-slate-800 hover:border-indigo-400 flex items-center justify-center gap-2 text-slate-200 hover:text-indigo-300 transition-all text-xs font-semibold select-none shadow-sm active:scale-[0.98]"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>ছবি বা PDF ফাইল সিলেক্ট করুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem(MODAL_OPEN_KEY, 'true')
                      } catch {}
                      handleStartCamera()
                    }}
                    className="p-3 rounded-xl border border-dashed border-emerald-600/40 bg-emerald-950/20 hover:bg-emerald-950/30 hover:border-emerald-400 flex items-center justify-center gap-2 text-emerald-300 transition-all text-xs font-semibold select-none shadow-sm active:scale-[0.98]"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>ক্যামেরা দিয়ে ছবি তুলুন</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                clearDraft()
                onClose()
              }}
              disabled={recordMutation.isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={recordMutation.isPending || !!successInfo}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {recordMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>খরচ এন্ট্রি সম্পন্ন করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Category Creation / Management Modal */}
      <ManageCategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        initialType="EXPENSE"
        onCategoryCreated={(newCat) => {
          setCategoryId(newCat.id)
        }}
      />

      {/* In-App Live Camera Viewfinder Overlay */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-fade-in">
          {/* Top Bar */}
          <div className="w-full max-w-md flex items-center justify-between text-white py-2 px-1">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold tracking-wide">ভাউচার লাইভ ক্যামেরা</span>
            </div>
            <button
              type="button"
              onClick={handleCloseLiveCamera}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewfinder with Guide Overlay */}
          <div className="relative w-full max-w-md flex-1 my-2 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shadow-2xl">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
            {/* Visual Alignment Guide */}
            <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3">
              <span className="text-[11px] font-semibold bg-black/70 px-3 py-1 rounded-full text-emerald-300 shadow">
                ক্যাশ মেমো বা ভাউচারটি ফ্রেমের ভেতর রাখুন
              </span>
              <span className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded">
                আলোর দিকে ধরুন এবং হাত স্থির রাখুন
              </span>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="w-full max-w-md py-4 flex items-center justify-around">
            <button
              type="button"
              onClick={handleCloseLiveCamera}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800/90 rounded-xl hover:bg-slate-700"
            >
              বাতিল
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-400 shadow-xl shadow-emerald-500/50 flex items-center justify-center active:scale-95 transition-transform"
              title="ছবি তুলুন"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                <Camera className="w-6 h-6 text-emerald-600" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCameraStream()
                setIsLiveCameraOpen(false)
                fileInputRef.current?.click()
              }}
              className="px-4 py-2 text-xs font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-500/40 rounded-xl hover:bg-indigo-900/60"
            >
              গ্যালারি
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default AddExpenseModal
