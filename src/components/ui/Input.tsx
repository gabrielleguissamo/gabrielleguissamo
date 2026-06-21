import { useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
}

export function Input({ label, error, success, className = '', id, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const borderClass = error
    ? 'border-red-400 focus:border-red-500'
    : success
    ? 'border-green-400 focus:border-green-500'
    : 'border-gray-200 focus:border-green-500'

  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-ink-2">{label}</label>}
      <input
        id={inputId}
        className={`h-12 px-4 rounded-xl border bg-white text-ink text-sm outline-none transition-colors ${borderClass} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
