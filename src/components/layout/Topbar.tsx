import { Bell, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation()
  const { profile } = useAuth()
  const title = pageTitles[location.pathname] ?? 'Terapô.pro'

  const now = new Date()
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'TO'

  return (
    <div className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-ink-4 hover:text-ink">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-serif text-xl font-semibold text-ink">{title}</h1>
          <p className="text-xs text-ink-5">{dateStr}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative text-ink-4 hover:text-ink transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
        </button>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        )}
      </div>
    </div>
  )
}
