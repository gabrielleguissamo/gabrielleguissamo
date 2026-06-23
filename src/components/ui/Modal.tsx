import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  onClose?: () => void
  dismissible?: boolean
  maxWidth?: string
  children: ReactNode
  className?: string
  labelledBy?: string
  zIndex?: string
}

export function Modal({ onClose, dismissible = true, maxWidth = 'max-w-lg', children, className = '', labelledBy, zIndex = 'z-50' }: ModalProps) {
  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${zIndex} flex items-center justify-center p-4 overflow-y-auto`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div className={`bg-white rounded-2xl border border-green-50 shadow-xl w-full ${maxWidth} p-6 md:p-8 relative max-h-[90vh] overflow-y-auto ${className}`}>
        {dismissible && onClose && (
          <button onClick={onClose} className="absolute top-5 right-5 text-ink-4 hover:text-ink z-10" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
