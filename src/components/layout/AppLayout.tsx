import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { isAdminEmail } from '../../lib/adminConfig'
import { UpgradeModal } from '../relatorio/UpgradeModal'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, hasActiveSubscription, freeReportsLeft } = useAuth()

  const isAdmin = isAdminEmail(user?.email)
  const showTrialBanner = !isAdmin && !hasActiveSubscription && freeReportsLeft > 0
  const isLocked = !isAdmin && !hasActiveSubscription && freeReportsLeft <= 0

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
          <div
            className={`border-b text-sm text-center py-2 px-4 ${
              freeReportsLeft <= 1
                ? 'bg-red-50 border-red-300 text-red-700 font-medium animate-pulse'
                : freeReportsLeft === 2
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            {freeReportsLeft <= 1 ? (
              <>Este é seu último relatório gratuito!{' '}</>
            ) : (
              <>Você ainda tem {freeReportsLeft} relatórios gratuitos.{' '}</>
            )}
            <a href="/configuracoes" className="font-medium underline">Assine agora</a> para não perder acesso.
          </div>
        )}
        <main className="flex-1 overflow-auto bg-cream">
          <Outlet />
        </main>
      </div>

      {isLocked && <UpgradeModal dismissible={false} onClose={() => {}} />}
    </div>
  )
}
