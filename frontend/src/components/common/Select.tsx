import React from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  options?: SelectOption[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      placeholder,
      children,
      className,
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-slate-300 tracking-wide"
          >
            {label}
            {required && <span className="text-rose-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            required={required}
            className={cn(
              'w-full appearance-none rounded-xl bg-slate-900/60 border text-slate-100 text-sm px-4 py-2.5 pr-10 transition-all duration-200 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:border-transparent',
              error
                ? 'border-rose-500/80 focus:ring-rose-500/50 bg-rose-950/10'
                : 'border-slate-700/70 hover:border-slate-600 focus:ring-primary-500/50 focus:border-primary-500',
              disabled && 'opacity-50 cursor-not-allowed bg-slate-800/40',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-slate-900 text-slate-500">
                {placeholder}
              </option>
            )}

            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-slate-900 text-slate-100 py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
            {error ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {error ? (
          <p className="text-xs text-rose-400 flex items-center gap-1 font-medium mt-1">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-400 mt-1">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'
