import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, FileText,
  DollarSign, BarChart2, Settings, LogOut, X, ShieldCheck, Bell
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ADMIN_EMAIL } from '../../lib/adminConfig'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/avisos', icon: Bell, label: 'Avisos' },
  { to: '/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/prontuarios', icon: FileText, label: 'Prontuários' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/relatorios', icon: BarChart2, label: 'Relatórios' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.email === ADMIN_EMAIL

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'TO'

  return (
    <div className="w-60 bg-green-800 h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl font-bold text-white">Terapô.pro</span>
        {onClose && (
          <button onClick={onClose} className="text-green-200 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-500 text-white'
                  : 'text-green-100 hover:bg-green-700'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-500 text-white'
                  : 'text-green-100 hover:bg-green-700'
              }`
            }
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            Admin
          </NavLink>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-green-700">
        <div className="flex items-center gap-3 mb-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {profile?.full_name ?? 'Terapeuta'}
            </p>
            <p className="text-green-300 text-xs truncate">{profile?.plan ?? 'inicial'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-green-200 hover:text-white text-sm w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  )
}
