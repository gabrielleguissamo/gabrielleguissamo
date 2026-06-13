import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { TrialExpired } from '../../pages/app/TrialExpired'
import { ADMIN_EMAIL } from '../../lib/adminConfig'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, hasActiveSubscription, trialDaysLeft } = useAuth()

  const isAdmin = user?.email === ADMIN_EMAIL
  const trialExpired = !isAdmin && !hasActiveSubscription && trialDaysLeft !== null && trialDaysLeft <= 0

  if (trialExpired) {
    return <TrialExpired />
  }

  const showTrialBanner = !isAdmin && !hasActiveSubscription && trialDaysLeft !== null && trialDaysLeft > 0

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        {showTrialBanner && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-700 text-sm text-center py-2 px-4">
            Seu teste gratuito termina em {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''}.{' '}
            <a href="/configuracoes" className="font-medium underline">Assine agora</a> para não perder o acesso.
          </div>
        )}
        <main className="flex-1 overflow-auto bg-cream">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
