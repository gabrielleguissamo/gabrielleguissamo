import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

export function ApiStatus() {
  const [status, setStatus] = useState<'ok' | 'missing' | 'checking'>('checking')

  useEffect(() => {
    const key = import.meta.env.VITE_ANTHROPIC_API_KEY
    setStatus(!key || key === '' ? 'missing' : 'ok')
  }, [])

  if (status === 'checking') return null

  if (status === 'missing') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-full shadow">
        <XCircle size={13} />
        API não configurada — adicione VITE_ANTHROPIC_API_KEY no .env.local
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-2 rounded-full shadow">
      <CheckCircle size={13} />
      IA conectada
    </div>
  )
}
