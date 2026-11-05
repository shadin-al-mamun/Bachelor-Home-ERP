import React from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import type { ExtendedReceipt } from '../api/useReceipts'
import { Printer, ShieldCheck, Building } from 'lucide-react'
import { useBrandingStore } from '@/app/store/useBrandingStore'

interface ReceiptPrintViewProps {
  isOpen: boolean
  onClose: () => void
  receipt: ExtendedReceipt | null
}

export const ReceiptPrintView: React.FC<ReceiptPrintViewProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  const { orgName, tagline, address, phone, logoUrl, receiptFooterNote } = useBrandingStore()

  const handlePrint = () => {
    window.print()
  }

  const paymentMethodLabel: Record<string, string> = {
    CASH: 'নগদ ক্যাশ (Cash)',
    BANK_TRANSFER: 'ব্যাংক ট্রান্সফার (Bank)',
    MFS: 'মোবাইল ব্যাংকিং (bKash/Nagad)',
  }

  // Normalize items/allocations so that total line items strictly match the cash receipt amount
  const displayRows = React.useMemo(() => {
    if (!receipt) return []

    const rawList: {
      head_name: string
      description?: string
      billing_month?: string
      amount: number
    }[] = []

    if (receipt.items && receipt.items.length > 0) {
      receipt.items.forEach((it) => {
        rawList.push({
          head_name: it.head_name,
          description: it.description || '',
          billing_month: it.billing_month || '—',
          amount: Number(it.amount) || 0,
        })
      })
    } else if (receipt.allocations && receipt.allocations.length > 0) {
      receipt.allocations.forEach((al) => {
        rawList.push({
          head_name: al.description || (al.charge_type ? `${al.charge_type} ফি` : 'পেমেন্ট সমন্বয় ফি'),
          description: '',
          billing_month: al.billing_month || '—',
          amount: Number(al.amount) || 0,
        })
      })
    }

    if (rawList.length === 0) {
      return [{
        head_name: 'সাধারণ পেমেন্ট কালেকশন',
        description: '',
        billing_month: '—',
        amount: Number(receipt.amount) || 0,
      }]
    }

    // Deduplicate / cap items so total displayed line items never exceed the actual receipt amount
    let remainingReceiptCash = Number(receipt.amount) || 0
    const finalRows: typeof rawList = []

    for (const item of rawList) {
      if (remainingReceiptCash <= 0) break
      const rowAmt = Math.min(item.amount, remainingReceiptCash)
      if (rowAmt > 0) {
        finalRows.push({
          ...item,
          amount: rowAmt,
        })
        remainingReceiptCash = Math.max(0, remainingReceiptCash - rowAmt)
      }
    }

    return finalRows.length > 0
      ? finalRows
      : [{
          head_name: rawList[0].head_name,
          description: rawList[0].description,
          billing_month: rawList[0].billing_month || '—',
          amount: Number(receipt.amount) || 0,
        }]
  }, [receipt])

  if (!receipt) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="অফিসিয়াল মানি রিসিপ্ট ভাউচার"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Printable Paper Voucher Card */}
        <div
          id="printable-receipt-card"
          className="p-6 md:p-8 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-xl space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow overflow-hidden shrink-0 border border-slate-800">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Building className="w-6 h-6 text-primary-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {orgName || 'ব্যাচেলর হোম ইআরপি'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {tagline || 'স্মার্ট ব্যাচেলর হোস্টেল ও মেস ম্যানেজমেন্ট'}
                </p>
                {(address || phone) ? (
                  <p className="text-[11px] text-slate-500">
                    {address}{address && phone ? ' • ' : ''}{phone ? `হটলাইন: ${phone}` : ''}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold uppercase tracking-wider mb-1">
                {receipt.is_void ? 'বাতিলকৃত (VOID)' : 'মানি রিসিপ্ট'}
              </span>
              <p className="text-sm font-mono font-black text-slate-800">
                {receipt.receipt_number}
              </p>
              <p className="text-xs text-slate-500">
                তারিখ: {formatDateBn(receipt.receipt_date)}
              </p>
            </div>
          </div>

          {/* Boarder & Payment Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block text-[11px]">বর্ডার বিবরণী</span>
              <p className="font-bold text-slate-900 text-sm">{receipt.boarder_name}</p>
              <p className="font-mono text-slate-600">আইডি: {receipt.boarder_code}</p>
              {receipt.boarder_phone && (
                <p className="text-slate-600">মোবাইল: {receipt.boarder_phone}</p>
              )}
              {receipt.seat_code && (
                <p className="text-slate-700 font-medium">
                  আবাসন: {receipt.flat_name || ''} ({receipt.seat_code})
                </p>
              )}
            </div>

            <div className="space-y-1 text-right">
              <span className="text-slate-400 font-semibold block text-[11px]">পেমেন্ট মাধ্যম ও অ্যাকাউন্ট</span>
              <p className="font-bold text-slate-800">
                {paymentMethodLabel[receipt.payment_method] || receipt.payment_method}
              </p>
              <p className="text-slate-600">হিসাব: {receipt.account_name}</p>
              {receipt.transaction_reference && (
                <p className="font-mono text-slate-700 font-semibold">
                  ট্রানজ্যাকশন আইডি: {receipt.transaction_reference}
                </p>
              )}
              <p className="text-slate-500">
                কালেক্টর: {receipt.collector_name}
              </p>
            </div>
          </div>

          {/* Itemized Settled Charges Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">ক্রমিক</th>
                  <th className="py-2.5 px-3">চার্জের বিবরণ</th>
                  <th className="py-2.5 px-3">বিলিং মাস</th>
                  <th className="py-2.5 px-3 text-right">সমন্বয়কৃত টাকা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {row.head_name}
                      {row.description ? (
                        <span className="text-[11px] text-slate-500 font-normal block">
                          {row.description}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {row.billing_month || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrencyBn(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                  <td colSpan={3} className="py-3 px-3 text-right">
                    মোট গৃহীত টাকা (Total Paid):
                  </td>
                  <td className="py-3 px-3 text-right text-base text-emerald-700 font-black">
                    {formatCurrencyBn(receipt.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Remarks & Footer Notes */}
          {receipt.remarks && (
            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/50 text-[11px] text-amber-900">
              <span className="font-semibold">বিশেষ মন্তব্য: </span>
              {receipt.remarks}
            </div>
          )}

          {/* Signatures & Verification Stamp */}
          <div className="pt-8 flex items-end justify-between border-t border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{receiptFooterNote || 'সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। সিগনেচার প্রয়োজন নেই।'}</span>
            </div>

            <div className="text-center space-y-1">
              <div className="w-36 border-b border-dashed border-slate-400 pb-1 font-semibold text-slate-700">
                {receipt.collector_name}
              </div>
              <span className="text-[10px] text-slate-500 block">আদায়কারীর স্বাক্ষর</span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            বন্ধ করুন
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="bg-primary-600 hover:bg-primary-500"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              প্রিন্ট ভাউচার (Print)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
export default ReceiptPrintView
