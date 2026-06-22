import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotFound } from './pages/NotFound'

import { Login } from './pages/auth/Login'
import { Cadastro } from './pages/auth/Cadastro'
import { RecuperarSenha } from './pages/auth/RecuperarSenha'
import { Callback } from './pages/auth/Callback'
import { GoogleCalendarCallback } from './pages/auth/GoogleCalendarCallback'
import { ResetSenha } from './pages/auth/ResetSenha'
import { VerificarEmail } from './pages/auth/VerificarEmail'
import { TermosUso } from './pages/public/TermosUso'
import { PoliticaPrivacidade } from './pages/public/PoliticaPrivacidade'

import { Dashboard } from './pages/app/Dashboard'
import { Agenda } from './pages/app/Agenda'
import { Avisos } from './pages/app/Avisos'
import { Pacientes } from './pages/app/Pacientes'
import { Prontuarios } from './pages/app/Prontuarios'
import { Financeiro } from './pages/app/Financeiro'
import { Relatorios } from './pages/app/Relatorios'
import { Configuracoes } from './pages/app/Configuracoes'
import { Admin } from './pages/app/Admin'

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route path="/auth/google-calendar-callback" element={<GoogleCalendarCallback />} />
          <Route path="/auth/reset" element={<ResetSenha />} />
          <Route path="/verificar-email" element={<VerificarEmail />} />
          <Route path="/termos" element={<TermosUso />} />
          <Route path="/privacidade" element={<PoliticaPrivacidade />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/avisos" element={<Avisos />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/prontuarios" element={<Prontuarios />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
