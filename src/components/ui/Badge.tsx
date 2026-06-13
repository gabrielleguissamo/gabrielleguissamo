interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'neutral'
  children: React.ReactNode
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  const variants = {
    success: 'bg-green-50 text-green-600',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-600',
    neutral: 'bg-gray-100 text-gray-600',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
