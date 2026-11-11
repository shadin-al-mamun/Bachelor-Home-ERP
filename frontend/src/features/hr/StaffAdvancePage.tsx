import React, { useState, useMemo } from 'react'
import {
  HandCoins,
  PlusCircle,
  Search,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  X,
  User,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useStaffMembers, useStaffAdvances, useRecordStaffAdvance, useReconcileStaffAdvance } from './api/useHR'
import { useFinancialAccounts } from '@/features/billing/api/useReceipts'

export const StaffAdvancePage: React.FC = () => {
  const { data: staffList = [] } = useStaffMembers()
  const { data: advances = [], isLoading, refetch } = useStaffAdvances()
  const { data: accounts = [] } = useFinancialAccounts()
  const recordAdvanceMutation = useRecordStaffAdvance()
  const reconcileMutation = useReconcileStaffAdvance()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DEDUCTED'>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    staff_id: '',
    amount: '',
    disbursed_from_account_id: '',
    advance_date: new Date().toISOString().slice(0, 10),
    remarks: '',
  })

  // Filtered Advances
  const filteredAdvances = useMemo(() => {
    return advances.filter((a) => {
      const matchSearch =
        a.voucher_no?.toLowerCase().includes(search.toLowerCase()) ||
        a.staff?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.staff?.staff_code?.toLowerCase().includes(search.toLowerCase()) ||
        a.remarks?.toLowerCase().includes(search.toLowerCase())

      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [advances, search, statusFilter])

  // Summary Metrics
  const totalAdvances = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
  const pendingAdvances = advances
    .filter((a) => a.status === 'PENDING')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
  const deductedAdvances = advances
    .filter((a) => a.status === 'DEDUCTED')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  const handleOpenModal = () => {
    const activeAccounts = accounts.filter((acc) => acc.is_active)
    setFormData({
      staff_id: staffList[0]?.id || '',
      amount: '',
      disbursed_from_account_id: activeAccounts[0]?.id || '',
      advance_date: new Date().toISOString().slice(0, 10),
      remarks: '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(formData.amount)
    if (!formData.staff_id) {
      alert('কর্মচারী নির্বাচন করুন।')
      return
    }
    if (!amt || amt <= 0) {
      alert('অগ্রিম টাকার পরিমাণ অবশ্যই ০ টাকার বেশি হতে হবে।')
      return
    }
    if (!formData.disbursed_from_account_id) {
      alert('টাকা দেওয়ার ক্যাশ ড্রয়ার বা অ্যাকাউন্ট নির্বাচন করুন।')
      return
    }

    try {
      await recordAdvanceMutation.mutateAsync({
        staff_id: formData.staff_id,
        amount: amt,
        disbursed_from_account_id: formData.disbursed_from_account_id,
        advance_date: formData.advance_date,
        remarks: formData.remarks,
      })
      setIsModalOpen(false)
      refetch()
    } catch (err: any) {
      alert(err.message || 'অগ্রিম বেতন সংরক্ষণ করতে ব্যর্থ হয়েছে।')
    }
  }

  const handleDirectReconcile = async (advanceId: string, staffName?: string) => {
    const confirm = window.confirm(
      `আপনি কি ${staffName || 'এই কর্মীর'} অগ্রিম ভাউচারটি সমন্বয় (Deducted/Reconciled) হিসেবে চিহ্নিত করতে চান?`
    )
    if (confirm) {
      try {
        await reconcileMutation.mutateAsync({
          advanceId,
          remarks: 'সরাসরি সমন্বিত',
        })
        refetch()
      } catch (err: any) {
        alert(err.message || 'সমন্বয় করতে ব্যর্থ হয়েছে।')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">
              অগ্রিম বেতন ও লোন খতিয়ান
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Staff Advance
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            মাসের মাঝামাঝি কর্মচারীদের দেওয়া অগ্রিম বেতন এবং মাস শেষে বেতন শিটে কর্তন ব্যবস্থাপনা।
          </p>
        </div>

        <Button
          onClick={handleOpenModal}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          অগ্রিম বেতন প্রদান করুন
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-medium text-slate-400 block truncate">মোট বিতরণকৃত অগ্রিম</span>
            <span className="text-sm sm:text-2xl font-black font-mono text-white mt-0.5 block">
              ৳{totalAdvances.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] sm:text-[11px] text-slate-400 block truncate">সর্বমোট অগ্রিম ভাউচার</span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 ml-1.5">
            <HandCoins className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-medium text-amber-400 block truncate">সমন্বয়ের অপেক্ষায়</span>
            <span className="text-sm sm:text-2xl font-black font-mono text-amber-400 mt-0.5 block">
              ৳{pendingAdvances.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] sm:text-[11px] text-slate-400 block truncate">বেতন থেকে কর্তন হবে</span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 ml-1.5">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-medium text-emerald-400 block truncate">ইতিমধ্যে সমন্বিত</span>
            <span className="text-sm sm:text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
              ৳{deductedAdvances.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] sm:text-[11px] text-slate-400 block truncate">বেতন শিটে সমন্বিত</span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 ml-1.5">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ভাউচার নং, কর্মীর নাম বা কারণ দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            সকল ({advances.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            অপেক্ষমাণ ({advances.filter((a) => a.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setStatusFilter('DEDUCTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'DEDUCTED'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            সমন্বিত ({advances.filter((a) => a.status === 'DEDUCTED').length})
          </button>
        </div>
      </div>

      {/* Informational Guidance Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <span className="font-bold text-amber-300">অগ্রিম বেতন স্বয়ংক্রিয় সমন্বয় তথ্য:</span> কর্মীকে প্রদত্ত অগ্রিম টাকা মাস শেষে <strong>&quot;৩. মাসিক বেতন শিট (Payroll)&quot;</strong>-এ বেতন গণনা ও পরিশোধের সময় স্বয়ংক্রিয়ভাবে মূল বেতন থেকে কর্তন ও সমন্বিত হয়ে যায়। এছাড়া প্রয়োজন হলে আপনি নিচের তালিকা থেকেও <strong>&quot;সরাসরি সমন্বয়&quot;</strong> বাটনে ক্লিক করে তাৎক্ষণিক সমন্বয় করতে পারেন।
        </div>
      </div>

      {/* Advance Records Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">অগ্রিম তালিকা লোড হচ্ছে...</div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-12 text-center">
            <HandCoins className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">কোনো অগ্রিম বেতনের রেকর্ড পাওয়া যায়নি।</p>
            <p className="text-xs text-slate-500 mt-1">কর্মচারীকে অগ্রিম টাকা প্রদান করতে উপরের বাটনে ক্লিক করুন।</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">ভাউচার নং ও তারিখ</th>
                    <th className="py-3 px-4">কর্মচারী</th>
                    <th className="py-3 px-4">পদবী ও বিভাগ</th>
                    <th className="py-3 px-4 text-right">অগ্রিম পরিমাণ</th>
                    <th className="py-3 px-4">প্রদানকারী অ্যাকাউন্ট</th>
                    <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-4">মন্তব্য</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredAdvances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-amber-400 block">{adv.voucher_no}</span>
                        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {adv.advance_date}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-primary-400 font-bold shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span>{adv.staff?.full_name || 'কর্মচারী'}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {adv.staff?.staff_code || ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="font-medium block">{adv.staff?.designation || '-'}</span>
                        <span className="text-[10px] text-slate-500">{adv.staff?.department || '-'}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black font-mono text-amber-400 text-sm">
                        ৳{Number(adv.amount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                          {adv.disbursed_from_account?.account_name || 'ক্যাশ ড্রয়ার'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                            adv.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {adv.status === 'PENDING' ? (
                            <>
                              <Clock className="w-3 h-3" /> কর্তনের অপেক্ষায়
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> বেতন থেকে কর্তিত
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 max-w-[180px] truncate">
                        {adv.remarks || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {adv.status === 'PENDING' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDirectReconcile(adv.id, adv.staff?.full_name)}
                            disabled={reconcileMutation.isPending}
                            className="text-[11px] h-7 px-2.5 rounded-lg font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          >
                            সরাসরি সমন্বয়
                          </Button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-medium">সমন্বিত ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-800/80">
              {filteredAdvances.map((adv) => (
                <div key={adv.id} className="p-3.5 space-y-3 bg-slate-900/30 hover:bg-slate-900/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-primary-400 font-bold shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white block truncate">{adv.staff?.full_name || 'কর্মচারী'}</span>
                        <span className="text-xs text-primary-400 block truncate">{adv.staff?.designation || '-'}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 shrink-0 ${
                        adv.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {adv.status === 'PENDING' ? (
                        <>
                          <Clock className="w-3 h-3" /> কর্তনের অপেক্ষায়
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> সমন্বিত
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block">{adv.voucher_no}</span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {adv.advance_date}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-amber-400 block font-medium">অগ্রিম পরিমাণ</span>
                      <span className="text-sm font-black font-mono text-amber-400">
                        ৳{Number(adv.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                      {adv.disbursed_from_account?.account_name || 'ক্যাশ ড্রয়ার'}
                    </span>
                    {adv.remarks && <span className="text-[11px] text-slate-400 italic truncate max-w-[150px]">{adv.remarks}</span>}
                  </div>

                  {adv.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDirectReconcile(adv.id, adv.staff?.full_name)}
                      disabled={reconcileMutation.isPending}
                      className="w-full text-xs h-8 rounded-lg font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1"
                    >
                      সরাসরি সমন্বয় করুন
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Record Advance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-amber-400" />
                অগ্রিম বেতন প্রদান
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  কর্মচারী নির্বাচন করুন <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="">কর্মচারী নির্বাচন করুন...</option>
                  {staffList.filter((s) => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.designation}) — বেতন: ৳{s.monthly_salary}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  অগ্রিম টাকার পরিমাণ (টাকা) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="যেমন: 3000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-amber-400 font-mono font-bold rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  টাকা প্রদানের ক্যাশ বক্স / অ্যাকাউন্ট <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.disbursed_from_account_id}
                  onChange={(e) => setFormData({ ...formData, disbursed_from_account_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                >
                  {accounts.filter((a) => a.is_active).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (ব্যালেন্স: ৳{Number(acc.current_balance || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  অগ্রিম প্রদান করলে উক্ত ক্যাশ ড্রয়ার/অ্যাকাউন্ট থেকে টাকা তাৎক্ষণিক কর্তন হবে।
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  প্রদানের তারিখ
                </label>
                <input
                  type="date"
                  value={formData.advance_date}
                  onChange={(e) => setFormData({ ...formData, advance_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  অগ্রিম প্রদানের কারণ / মন্তব্য
                </label>
                <input
                  type="text"
                  placeholder="যেমন: জরুরি চিকিৎসা বা পারিবারিক প্রয়োজন"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={recordAdvanceMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4"
                >
                  {recordAdvanceMutation.isPending ? 'প্রদান করা হচ্ছে...' : 'নিশ্চিত করুন'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default StaffAdvancePage
