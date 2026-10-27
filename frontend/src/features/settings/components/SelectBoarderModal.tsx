import React, { useState, useMemo } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import type { BoarderWithRelations } from '@/features/boarders/api/useBoarders'
import {
  Search,
  User,
  CheckCircle2,
  Download,
  Printer,
  Eye,
  Building2,
  Phone,
  ShieldCheck,
  Loader2,
} from 'lucide-react'

interface SelectBoarderModalProps {
  isOpen: boolean
  onClose: () => void
  boarders: BoarderWithRelations[]
  selectedBoarder: BoarderWithRelations | null
  onSelectBoarder: (boarder: BoarderWithRelations) => void
  onDownloadPdf: (boarder: BoarderWithRelations) => Promise<void>
  onPrint: () => void
  isDownloading?: boolean
}

export const SelectBoarderModal: React.FC<SelectBoarderModalProps> = ({
  isOpen,
  onClose,
  boarders,
  selectedBoarder,
  onSelectBoarder,
  onDownloadPdf,
  onPrint,
  isDownloading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ACTIVE')
  const [tempSelected, setTempSelected] = useState<BoarderWithRelations | null>(selectedBoarder)

  // Sync tempSelected with selectedBoarder on open
  React.useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedBoarder || (boarders.length > 0 ? boarders[0] : null))
    }
  }, [isOpen, selectedBoarder, boarders])

  const filteredBoarders = useMemo(() => {
    return boarders.filter((b) => {
      // Status filter
      if (statusFilter !== 'ALL' && b.status !== statusFilter) {
        return false
      }
      // Search filter
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase()
      const name = (b.full_name || '').toLowerCase()
      const code = (b.boarder_code || '').toLowerCase()
      const phone = (b.phone_number || '').toLowerCase()
      const room = (b.active_allocation?.seat?.room?.name || '').toLowerCase()
      const seat = (b.active_allocation?.seat?.seat_name || '').toLowerCase()

      return (
        name.includes(q) ||
        code.includes(q) ||
        phone.includes(q) ||
        room.includes(q) ||
        seat.includes(q)
      )
    })
  }, [boarders, searchTerm, statusFilter])

  const handleSelect = (b: BoarderWithRelations) => {
    setTempSelected(b)
    onSelectBoarder(b)
  }

  const handleDownload = async () => {
    if (tempSelected) {
      onSelectBoarder(tempSelected)
      await onDownloadPdf(tempSelected)
    }
  }

  const currentBoarder = tempSelected || selectedBoarder

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ভাড়াটিয়া নিবন্ধন ফরম — বর্ডার নির্বাচন"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="বর্ডারের নাম, কোড, মোবাইল বা রুম নম্বর দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              আবাসিক ({boarders.filter((b) => b.status === 'ACTIVE').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              আবেদনকারী ({boarders.filter((b) => b.status === 'PENDING').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              সকল ({boarders.length})
            </button>
          </div>
        </div>

        {/* Boarders List Container */}
        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 border border-slate-800/80 rounded-2xl p-2 bg-slate-950/40 divide-y divide-slate-800/60">
          {filteredBoarders.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              কোনো বোর্ডার পাওয়া যায়নি। অনুসন্ধান শব্দ পরিবর্তন করে চেষ্টা করুন।
            </div>
          ) : (
            filteredBoarders.map((b) => {
              const isSelected = currentBoarder?.id === b.id
              const seatName = b.active_allocation?.seat?.seat_name
              const roomName = b.active_allocation?.seat?.room?.name

              return (
                <div
                  key={b.id}
                  onClick={() => handleSelect(b)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-500/15 border border-primary-500/40 shadow-sm'
                      : 'hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/80 flex-shrink-0 flex items-center justify-center">
                      {b.photo_url ? (
                        <img
                          src={b.photo_url}
                          alt={b.full_name}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">{b.full_name}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {b.boarder_code}
                        </span>
                        {b.status === 'ACTIVE' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            আবাসিক
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            আবেদনকারী
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 truncate">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {b.phone_number}
                        </span>
                        {roomName && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Building2 className="w-3 h-3 text-amber-400" />
                            {roomName} • {seatName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-lg border border-primary-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" />
                        নির্বাচিত
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Selected Boarder Preview Card */}
        {currentBoarder && (
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                নির্বাচিত বোর্ডারের তথ্য ও ফরম প্রস্তুতি
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                আইডি: {currentBoarder.boarder_code}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">নাম:</span>
                <span className="text-white font-medium truncate block">{currentBoarder.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">পিতা/অভিভাবক:</span>
                <span className="text-slate-200 truncate block">
                  {currentBoarder.father_name || currentBoarder.guardian_name || 'উল্লেখ নেই'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">মোবাইল:</span>
                <span className="text-slate-200 font-mono">{currentBoarder.phone_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block">সিট বরাদ্দ:</span>
                <span className="text-amber-300 font-medium truncate block">
                  {currentBoarder.active_allocation?.seat?.seat_name || 'বরাদ্দ নেই'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            ঢাকা মেট্রোপলিটন পুলিশ (DMP) নির্ধারিত অফিশিয়াল এ৪ ফরম্যাট
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-none border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              প্রিভিউ দেখুন
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrint}
              disabled={!currentBoarder}
              className="flex-1 sm:flex-none border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              প্রিন্ট
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownload}
              disabled={!currentBoarder || isDownloading}
              className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-600 to-primary-600 hover:from-cyan-500 hover:to-primary-500 text-white shadow-lg shadow-cyan-600/20 font-bold px-4"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  পিডিএফ তৈরি হচ্ছে...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1.5" />
                  ভাড়াটিয়া ফরম ডাউনলোড করুন
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SelectBoarderModal
