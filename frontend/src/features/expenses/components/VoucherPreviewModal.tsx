import React, { useState } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  Download,
  FileText,
  AlertTriangle,
  Receipt,
  Calendar,
  Building,
  CreditCard,
  User,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import type { ExtendedExpense } from '../api/useExpenses'

interface VoucherPreviewModalProps {
  expense: ExtendedExpense | null
  isOpen: boolean
  onClose: () => void
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  expense,
  isOpen,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)

  if (!isOpen || !expense) return null

  const isPdf =
    expense.voucher_attachment_url?.toLowerCase().endsWith('.pdf') ||
    expense.voucher_attachment_url?.includes('application/pdf')

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)
  const handleReset = () => {
    setZoomLevel(1)
    setRotation(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide font-mono">
                  {expense.expense_voucher_no}
                </h3>
                {expense.approval_status === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    অনুমোদিত
                  </span>
                )}
                {expense.approval_status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    অপেক্ষমান
                  </span>
                )}
                {expense.approval_status === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <XCircle className="w-3.5 h-3.5" />
                    প্রত্যাখ্যাত
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ক্যাশ মেমো ও ভাউচার সংযুক্তি প্রিভিউ
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {expense.voucher_attachment_url && (
              <>
                <a
                  href={expense.voucher_attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  title="নতুন ট্যাবে খুলুন"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href={expense.voucher_attachment_url}
                  download={`voucher_${expense.expense_voucher_no}`}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  title="ডাউনলোড ভাউচার"
                >
                  <Download className="w-4 h-4" />
                </a>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Two columns on desktop (Preview + Details) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left Column: Voucher Attachment (8 cols) */}
          <div className="lg:col-span-8 p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/60 min-h-[360px] relative">
            {expense.voucher_attachment_url ? (
              isPdf ? (
                <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center gap-4 bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
                  <FileText className="w-16 h-16 text-indigo-400 animate-pulse" />
                  <p className="text-sm font-medium text-slate-200">
                    পিডিএফ ফরম্যাট ভাউচার সংযুক্ত রয়েছে
                  </p>
                  <a
                    href={expense.voucher_attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    পিডিএফ ভিউয়ারে খুলুন
                  </a>
                </div>
              ) : (
                <div className="relative w-full flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-2">
                  {/* Floating Image Control Bar */}
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md">
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      title="জুম আউট"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono font-semibold text-slate-300 px-1">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      title="জুম ইন"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleRotate}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      title="ঘোরান (Rotate 90°)"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    {(zoomLevel !== 1 || rotation !== 0) && (
                      <button
                        onClick={handleReset}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold text-indigo-400 hover:bg-slate-800 transition-colors"
                      >
                        রিসেট
                      </button>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-center min-h-[380px] max-h-[560px] overflow-auto">
                    <img
                      src={expense.voucher_attachment_url}
                      alt={`Voucher ${expense.expense_voucher_no}`}
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-out',
                      }}
                      className="max-w-full max-h-[520px] object-contain rounded-xl shadow-2xl"
                    />
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-500 py-16">
                <Receipt className="w-12 h-12 text-slate-600 stroke-1" />
                <p className="text-sm font-medium">কোনো ভাউচার ছবি বা রশিদের স্ক্যান সংযুক্ত নেই</p>
                <span className="text-xs text-slate-500">
                  খরচটি সরাসরি ক্যাশ ড্রয়ার থেকে মেমো ছাড়া প্রদান করা হয়েছিল।
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Expense Particulars (4 cols) */}
          <div className="lg:col-span-4 p-5 sm:p-6 space-y-5 bg-slate-900/40">
            {/* Amount Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20">
              <span className="text-xs font-medium text-indigo-300 uppercase tracking-wider">
                ব্যয়ের মোট পরিমাণ
              </span>
              <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">
                ৳{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Rejection Warning if rejected */}
            {expense.approval_status === 'REJECTED' && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  বাতিলের কারণ:
                </div>
                <p className="text-xs leading-relaxed">
                  {expense.rejection_reason || 'কোনো কারণ উল্লেখ করা হয়নি।'}
                </p>
                {expense.approver_name && (
                  <p className="text-[11px] text-rose-400/80 pt-1 border-t border-rose-500/20">
                    বাতিল করেছেন: {expense.approver_name} ({expense.approved_at ? new Date(expense.approved_at).toLocaleDateString('bn-BD') : ''})
                  </p>
                )}
              </div>
            )}

            {/* Metadata key-value list */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  খরচের তারিখ:
                </span>
                <span className="font-semibold text-slate-200">
                  {expense.expense_date}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                  খাত / ক্যাটাগরি:
                </span>
                <span className="font-semibold text-slate-200 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700/60">
                  {expense.category_name}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  পরিশোধের উৎস:
                </span>
                <span className="font-semibold text-slate-200 text-right">
                  {expense.source_account_name}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  প্রযোজ্য স্থান/ফ্ল্যাট:
                </span>
                <span className="font-semibold text-slate-200">
                  {expense.flat_name ? (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/50 text-cyan-400 border border-cyan-800/50">
                      {expense.flat_name}
                    </span>
                  ) : (
                    <span className="text-slate-400">সার্বিক হোস্টেল (সাধারণ)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  পরিশোধকারী:
                </span>
                <span className="font-semibold text-slate-200">
                  {expense.payer_name}
                </span>
              </div>
            </div>

            {/* Description / Notes */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                খরচের বিস্তারিত বিবরণ:
              </span>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                {expense.description}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  )
}
export default VoucherPreviewModal
