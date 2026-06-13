import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeGoogleCalendarCode } from '../../lib/googleCalendar'

export function GoogleCalendarCallback() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      navigate('/configuracoes?google=error', { replace: true })
      return
    }

    if (!code) {
      navigate('/configuracoes?google=error', { replace: true })
      return
    }

    const redirectUri = `${window.location.origin}/auth/google-calendar-callback`
    exchangeGoogleCalendarCode(code, redirectUri)
      .then(() => navigate('/configuracoes?google=success', { replace: true }))
      .catch(() => navigate('/configuracoes?google=error', { replace: true }))
  }, [navigate])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
