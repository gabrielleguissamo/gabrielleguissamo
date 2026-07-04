import { useEffect, useRef, useState } from 'react'
import { Bell, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/agenda': 'Agenda',
  '/pacientes': 'Pacientes',
  '/prontuarios': 'Prontuários',
  '/financeiro': 'Financeiro',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
}

const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

interface TopbarProps {
  onMenuClick: () => void
}

interface NotificationItem {
  id: string
  message: string
}

function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation()
  const { user, profile } = useAuth()
  const title = pageTitles[location.pathname] ?? 'Terapô.pro'

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'TO'

  useEffect(() => {
    async function fetchNotifications() {
      if (!user) return

      const today = new Date()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const todayKey = toDateKey(today)
      const tomorrowKey = toDateKey(tomorrow)

      const { data } = await supabase
        .from('sessions')
        .select('id, date, time, status, patients(name)')
        .eq('user_id', user.id)
        .in('date', [todayKey, tomorrowKey])
        .neq('status', 'cancelado')
        .order('time', { ascending: true })

      const items: NotificationItem[] = (data ?? []).map((session) => {
        const patientName = (session.patients as unknown as { name: string } | null)?.name ?? 'Paciente'
        if (session.date === todayKey && session.status === 'pendente') {
          return { id: session.id, message: `Confirme a sessão de hoje com ${patientName} às ${session.time.slice(0, 5)}` }
        }
        if (session.date === todayKey) {
          return { id: session.id, message: `Sessão com ${patientName} hoje às ${session.time.slice(0, 5)}` }
        }
        return { id: session.id, message: `Lembrete: sessão com ${patientName} amanhã às ${session.time.slice(0, 5)}` }
      })

      setNotifications(items)
    }

    fetchNotifications()

    function handleVisibility() {
      if (document.visibilityState === 'visible') fetchNotifications()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100/80 px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-ink-4 hover:text-ink hover:bg-gray-100 transition-all">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-xl font-bold text-ink leading-tight">{title}</h1>
          <p className="text-xs text-ink-5 capitalize">{dateStr}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={containerRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-ink-4 hover:text-ink hover:bg-gray-100 transition-all"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/60 z-50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="font-semibold text-sm text-ink">Notificações</p>
                {notifications.length > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">{notifications.length}</span>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-4 text-center">Nenhuma notificação por aqui.</p>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {notifications.map((item) => (
                    <li key={item.id} className="px-5 py-3.5 text-sm text-ink hover:bg-gray-50 transition-colors leading-snug">
                      {item.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="w-9 h-9 rounded-xl object-cover ring-2 ring-gray-100" />
        ) : (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ring-2 ring-gray-100"
            style={{ background: 'linear-gradient(135deg, #2d7a3a, #3d9b4d)' }}>
            {initials}
          </div>
        )}
      </div>
    </div>
  )
}
