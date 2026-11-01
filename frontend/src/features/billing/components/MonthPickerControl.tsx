import React, { useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthPickerControlProps {
  value: string // 'YYYY-MM' or 'YYYY-MM-DD'
  onChange: (newMonth: string) => void // emits 'YYYY-MM'
  label?: string
  accentColor?: string // e.g. 'text-emerald-400', 'text-amber-400', 'text-indigo-400'
  required?: boolean
  className?: string
  disabled?: boolean
}

export const MonthPickerControl: React.FC<MonthPickerControlProps> = ({
  value,
  onChange,
  label = 'বিলিং মাস',
  accentColor = 'text-emerald-400',
  required = false,
  className = '',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const monthVal = value ? value.slice(0, 7) : ''

  const shiftMonth = (offset: number) => {
    if (!monthVal) return
    const [y, m] = monthVal.split('-').map(Number)
    const d = new Date(y, m - 1 + offset, 1)
    const newY = d.getFullYear()
    const newM = String(d.getMonth() + 1).padStart(2, '0')
    onChange(`${newY}-${newM}`)
  }

  const handleOpenPicker = () => {
    if (disabled) return
    try {
      inputRef.current?.showPicker?.()
    } catch {
      inputRef.current?.focus()
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner ${className} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          shiftMonth(-1)
        }}
        title="পূর্ববর্তী মাস"
        disabled={disabled}
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        onClick={handleOpenPicker}
        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-900/90 transition-colors cursor-pointer select-none"
        title="মাস পরিবর্তন করতে ক্লিক করুন"
      >
        <Calendar className={`w-3.5 h-3.5 ${accentColor} shrink-0`} />
        {label && <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{label}:</span>}
        <input
          ref={inputRef}
          type="month"
          required={required}
          value={monthVal}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value)
            }
          }}
          onClick={(e) => {
            e.stopPropagation()
            try {
              e.currentTarget.showPicker?.()
            } catch {}
          }}
          className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
        />
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          shiftMonth(1)
        }}
        title="পরবর্তী মাস"
        disabled={disabled}
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export default MonthPickerControl
