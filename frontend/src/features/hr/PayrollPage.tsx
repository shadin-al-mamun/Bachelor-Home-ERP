import React, { useState, useMemo } from 'react'
import {
  FileText,
  Zap,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  Printer,
  DollarSign,
  X,
  CreditCard,
  User,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { usePayrollSheets, useGeneratePayrollSheet, useDisbursePayrollItem } from './api/useHR'
import { useFinancialAccounts } from '@/features/billing/api/useReceipts'
import type { PayrollItem } from '@/types/hr'

export const PayrollPage: React.FC = () => {
  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const { data: payrollSheets = [], isLoading, refetch } = usePayrollSheets()
  const { data: accounts = [] } = useFinancialAccounts()
  const generateMutation = useGeneratePayrollSheet()
  const disburseMutation = useDisbursePayrollItem()

  // Modal States
  const [payingItem, setPayingItem] = useState<PayrollItem | null>(null)
  const [disburseAccountId, setDisburseAccountId] = useState('')
  const [disburseRemarks, setDisburseRemarks] = useState('')
  const [viewingPayslipItem, setViewingPayslipItem] = useState<PayrollItem | null>(null)

  // Current Month Payroll Sheet
  const currentSheet = useMemo(() => {
    return payrollSheets.find((s) => s.payroll_month === selectedMonth)
  }, [payrollSheets, selectedMonth])

  // Month Options (Past 6 months + Next 2 months)
  const monthOptions = useMemo(() => {
    const list: { value: string; label: string }[] = []
    const now = new Date()
    const monthsBn = [
      'জানুয়ারি',
      'ফেব্রুয়ারি',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টেম্বর',
      'অক্টোবর',
      'নভেম্বর',
      'ডিসেম্বর',
    ]

    for (let i = -5; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const lbl = `${monthsBn[d.getMonth()]} ${d.getFullYear()}`
      list.push({ value: val, label: lbl })
    }
    return list
  }, [])

  const handleGenerateSheet = async () => {
    try {
      await generateMutation.mutateAsync({
        payroll_month: selectedMonth,
      })
      refetch()
    } catch (err: any) {
      alert(err.message || 'বেতন শিট জেনারেট করতে ব্যর্থ হয়েছে।')
    }
  }

  const handleOpenPayModal = (item: PayrollItem) => {
    setPayingItem(item)
    const activeAccs = accounts.filter((a) => a.is_active)
    setDisburseAccountId(activeAccs[0]?.id || '')
    setDisburseRemarks(`${selectedMonth} মাসের বেতন বাবদ পরিশোধ`)
  }

  const handleConfirmDisbursement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingItem) return
    if (!disburseAccountId) {
      alert('টাকা দেওয়ার ক্যাশ ড্রয়ার বা অ্যাকাউন্ট নির্বাচন করুন।')
      return
    }

    try {
      await disburseMutation.mutateAsync({
        payroll_item_id: payingItem.id,
        disbursed_from_account_id: disburseAccountId,
        remarks: disburseRemarks,
      })
      setPayingItem(null)
      refetch()
    } catch (err: any) {
      alert(err.message || 'বেতন পরিশোধে ব্যর্থ হয়েছে।')
    }
  }

  const items = currentSheet?.items || []
  const totalBasic = currentSheet?.total_basic_salary || items.reduce((s, i) => s + (Number(i.basic_salary) || 0), 0)
  const totalDeductions =
    currentSheet?.total_deductions || items.reduce((s, i) => s + (Number(i.advance_deduction) || 0), 0)
  const totalNetPayable =
    currentSheet?.total_net_payable || items.reduce((s, i) => s + (Number(i.net_payable) || 0), 0)
  const totalPaid = currentSheet?.total_paid_amount || items.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">মাসিক পে-রোল ও বেতন শিট</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Payroll Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            মাসের সকল কর্মচারীর মূল বেতন, বোনাস ও অগ্রিম সমন্বয়ের মাধ্যমে বেতন শিট তৈরি ও পে-স্লিপ প্রিন্ট।
          </p>
        </div>

        {/* Month Selector & Generate Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shadow-md">
            <Calendar className="w-4 h-4 text-primary-400 shrink-0" />
            <label htmlFor="payroll-month" className="text-xs font-medium text-slate-300">
              হিসাব মাস:
            </label>
            <select
              id="payroll-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-primary-300 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleGenerateSheet}
            disabled={generateMutation.isPending}
            className="bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-primary-500/20"
          >
            <Zap className="w-4 h-4" />
            {currentSheet ? 'বেতন শিট পুনর্গণনা করুন' : 'বেতন শিট তৈরি করুন'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block">মোট ধার্যকৃত মূল বেতন</span>
            <span className="text-2xl font-black font-mono text-white mt-0.5 block">
              ৳{totalBasic.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400">সকল সক্রিয় স্টাফের নির্ধারিত বেতন</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-amber-400 block">মোট অগ্রিম কর্তন</span>
            <span className="text-2xl font-black font-mono text-amber-400 mt-0.5 block">
              ৳{totalDeductions.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400">মাসের বেতন থেকে কর্তিত অগ্রিম</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-primary-400 block">মোট প্রদেয় বেতন (Net)</span>
            <span className="text-2xl font-black font-mono text-primary-300 mt-0.5 block">
              ৳{totalNetPayable.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400">কর্তন বাদে চূড়ান্ত প্রদেয় টাকা</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-400 block">পরিশোধিত বেতন</span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
              ৳{totalPaid.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400">
              বকেয়া: ৳{Math.max(0, totalNetPayable - totalPaid).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sheet Content Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{selectedMonth} মাসের বেতন তালিকা</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {currentSheet?.payroll_batch_no || `PAY-${selectedMonth}`}
              </span>
            </h2>
          </div>

          {currentSheet && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold self-start sm:self-auto ${
                currentSheet.status === 'DISBURSED'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {currentSheet.status === 'DISBURSED' ? 'সম্পূর্ণ পরিশোধিত' : 'খসড়া / অনুমোদিত'}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">বেতন শিট লোড হচ্ছে...</div>
        ) : !currentSheet || items.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">
              {selectedMonth} মাসের কোনো বেতন শিট তৈরি করা হয়নি।
            </p>
            <p className="text-xs text-slate-500 mt-1">
              উপরে &quot;বেতন শিট তৈরি করুন&quot; বাটনে ক্লিক করে এক ক্লিকে পুরো মাসের শিট প্রস্তুত করুন।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">কর্মচারী ও পদবী</th>
                  <th className="py-3 px-4 text-right">মূল বেতন</th>
                  <th className="py-3 px-4 text-right">অগ্রিম কর্তন</th>
                  <th className="py-3 px-4 text-right">প্রদেয় বেতন (Net)</th>
                  <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-primary-400 font-bold shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span>{item.staff?.full_name || 'কর্মচারী'}</span>
                          <span className="text-[11px] text-primary-400 font-normal block">
                            {item.staff?.designation || '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.staff?.staff_code || ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
                      ৳{Number(item.basic_salary).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-400">
                      {item.advance_deduction > 0
                        ? `-৳${Number(item.advance_deduction).toLocaleString('en-IN')}`
                        : '৳০'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                      ৳{Number(item.net_payable).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                          item.payment_status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {item.payment_status === 'PAID' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> পরিশোধিত
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> অপরিশোধিত
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.payment_status !== 'PAID' ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayModal(item)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm"
                          >
                            বেতন পরিশোধ
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingPayslipItem(item)}
                            className="text-xs h-8 px-2.5 rounded-lg bg-slate-800 text-primary-300 hover:text-white hover:bg-slate-700 flex items-center gap-1 font-semibold"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            পে-স্লিপ
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disburse Salary Modal */}
      {payingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                কর্মচারীর বেতন পরিশোধ
              </h2>
              <button onClick={() => setPayingItem(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDisbursement} className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">কর্মচারী:</span>
                  <span className="font-bold text-white">{payingItem.staff?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">পদবী:</span>
                  <span className="text-slate-300">{payingItem.staff?.designation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">মূল বেতন:</span>
                  <span className="font-mono text-slate-300">
                    ৳{Number(payingItem.basic_salary).toLocaleString('en-IN')}
                  </span>
                </div>
                {payingItem.advance_deduction > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>অগ্রিম কর্তন:</span>
                    <span className="font-mono font-semibold">
                      -৳{Number(payingItem.advance_deduction).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
                  <span className="font-bold text-slate-200">নিট প্রদেয় টাকা:</span>
                  <span className="font-black font-mono text-emerald-400">
                    ৳{Number(payingItem.net_payable).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  টাকা প্রদানের ক্যাশ বক্স / অ্যাকাউন্ট <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={disburseAccountId}
                  onChange={(e) => setDisburseAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                >
                  {accounts.filter((a) => a.is_active).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (ব্যালেন্স: ৳{Number(acc.current_balance || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  বেতন পরিশোধের সাথে সাথে নির্বাচিত অ্যাকাউন্ট থেকে টাকা কর্তন হবে এবং খরচের ভাউচার তৈরি হবে।
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">মন্তব্য / রেফারেন্স</label>
                <input
                  type="text"
                  value={disburseRemarks}
                  onChange={(e) => setDisburseRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPayingItem(null)}
                  className="text-slate-400 hover:text-white"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={disburseMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4"
                >
                  {disburseMutation.isPending ? 'পরিশোধ হচ্ছে...' : 'পরিশোধ নিশ্চিত করুন'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Payslip Printable Modal */}
      {viewingPayslipItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary-400" />
                অফিসিয়াল বেতন রশিদ / পে-স্লিপ
              </h2>
              <button
                onClick={() => setViewingPayslipItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Payslip Body */}
            <div className="p-6 bg-slate-950 text-slate-100 space-y-4 overflow-y-auto" id="printable-payslip">
              <div className="text-center pb-3 border-b border-slate-800">
                <h3 className="text-lg font-black tracking-wide text-white uppercase">
                  ব্যাচেলর হোম হোস্টেল ও মেস
                </h3>
                <p className="text-xs text-slate-400">কর্মচারী মাসিক বেতন রশিদ (Salary Payslip)</p>
                <span className="text-[11px] font-mono text-primary-400 font-bold mt-1 inline-block">
                  হিসাব মাস: {selectedMonth}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">কর্মচারীর নাম:</span>
                  <span className="font-bold text-white text-sm">{viewingPayslipItem.staff?.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">কর্মী আইডি ও পদবী:</span>
                  <span className="font-medium text-slate-200">
                    {viewingPayslipItem.staff?.staff_code} • {viewingPayslipItem.staff?.designation}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">মোবাইল:</span>
                  <span className="font-mono text-slate-300">{viewingPayslipItem.staff?.phone_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">পরিশোধের তারিখ:</span>
                  <span className="font-mono text-slate-300">
                    {viewingPayslipItem.disbursement_date
                      ? viewingPayslipItem.disbursement_date.slice(0, 10)
                      : new Date().toISOString().slice(0, 10)}
                  </span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">বিবরণ (Description)</th>
                      <th className="py-2.5 px-3 text-right">টাকা (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300">নির্ধারিত মাসিক মূল বেতন (Basic Salary)</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-white">
                        ৳{Number(viewingPayslipItem.basic_salary).toLocaleString('en-IN')}
                      </td>
                    </tr>
                    {viewingPayslipItem.advance_deduction > 0 && (
                      <tr className="text-amber-400">
                        <td className="py-2.5 px-3">অগ্রিম বেতন কর্তন (Advance Deduction)</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          -৳{Number(viewingPayslipItem.advance_deduction).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-900/60 font-bold text-sm">
                      <td className="py-3 px-3 text-emerald-400">পরিশোধিত নিট বেতন (Net Paid)</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-400">
                        ৳{Number(viewingPayslipItem.net_payable).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-8 grid grid-cols-2 gap-4 text-center text-xs text-slate-400">
                <div className="pt-2 border-t border-slate-700">
                  <span>গ্রহীতার স্বাক্ষর</span>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <span>অনুমোদনকারী কর্মকর্তা</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-900">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingPayslipItem(null)}
                className="text-slate-400 hover:text-white"
              >
                বন্ধ করুন
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-primary-600 hover:bg-primary-500 text-white font-bold gap-2"
              >
                <Printer className="w-4 h-4" />
                প্রিন্ট করুন
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default PayrollPage
