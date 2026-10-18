import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  className?: string
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  className,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-opacity" />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 flex flex-col w-[95vw] max-h-[88vh] translate-x-[-50%] translate-y-[-50%] p-4 sm:p-6 duration-200',
            'glass-card border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            widthClasses[maxWidth],
            className
          )}
        >
          {/* Modal Header */}
          <div className="flex items-start justify-between border-b border-slate-800/80 pb-3 shrink-0">
            <div className="space-y-1 pr-4">
              {title && (
                <Dialog.Title className="text-base sm:text-lg font-semibold text-white tracking-tight">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="text-xs sm:text-sm text-slate-400">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Modal Scrollable Body */}
          <div className="py-3 text-slate-200 overflow-y-auto min-h-0 flex-1 overscroll-contain pr-1 sm:pr-2">
            {children}
          </div>

          {/* Modal Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80 shrink-0">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Modal
