import { useState, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { User, Building2, Bell, CreditCard, Shield, Check, Download, Gift, Copy, type LucideIcon } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Toast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { isGoogleCalendarConnected, getGoogleCalendarAuthUrl, disconnectGoogleCalendar } from '../../lib/googleCalendar'
import { getStripeCheckoutUrl, getWhatsappCeoUrl } from '../../lib/stripeConfig'
import { formatPhone } from '../../lib/masks'
import { FREE_REPORT_LIMIT } from '../../lib/planLimits'

type Tab = 'perfil' | 'clinica' | 'notificacoes' | 'plano' | 'indicacoes' | 'seguranca'
type PlanKey = 'inicial' | 'profissional' | 'business'

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: 'perfil', label: 'Perfil', Icon: User },
  { key: 'clinica', label: 'Clínica', Icon: Building2 },
  { key: 'notificacoes', label: 'Notificações', Icon: Bell },
  { key: 'plano', label: 'Plano', Icon: CreditCard },
  { key: 'indicacoes', label: 'Indique e ganhe', Icon: Gift },
  { key: 'seguranca', label: 'Segurança', Icon: Shield },
]

const PLANO_INFO: Record<PlanKey, { label: string; desc: string; features: string[] }> = {
  inicial: {
    label: 'Plano Inicial',
    desc: 'Até 15 pacientes ativos',
    features: ['Até 15 pacientes ativos', '20 relatórios com IA por mês', 'Agenda e prontuários', 'Relatórios básicos'],
  },
  profissional: {
    label: 'Plano Profissional',
    desc: 'Até 150 pacientes ativos',
    features: ['Até 150 pacientes ativos', '200 relatórios com IA por mês', 'Relatórios avançados', 'Financeiro completo', 'Suporte prioritário'],
  },
  business: {
    label: 'Plano Business',
    desc: 'Pacientes ilimitados',
    features: ['Pacientes ilimitados', 'Relatórios ilimitados', 'Multiusuário', 'Relatórios personalizados', 'Atendimento dedicado'],
  },
}

const PLAN_ORDER: PlanKey[] = ['inicial', 'profissional', 'business']

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function Configuracoes() {
  const { user, profile, refreshProfile, signOut, hasActiveSubscription } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('perfil')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [referralSummary, setReferralSummary] = useState<{
    active_count: number; pending_count: number; canceled_count: number
    tier_rate: number; estimated_commission: number
    referral_code: string; referral_mode: string | null; pix_key: string | null
  } | null>(null)
  const [loadingReferral, setLoadingReferral] = useState(false)
  const [pixKeyInput, setPixKeyInput] = useState('')
  const [savingReferral, setSavingReferral] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)

  async function saveToProfile(data: Record<string, unknown>) {
    if (!user) return false
    const { error: updateError, data: updated } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
    if (updateError) {
      setToast({ message: `Erro: ${updateError.message}`, type: 'error' })
      return false
    }
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, email: user.email, ...data })
      if (insertError) {
        setToast({ message: `Erro: ${insertError.message}`, type: 'error' })
        return false
      }
    }
    await refreshProfile()
    return true
  }

  // Profile form
  const [fullName, setFullName] = useState('')
  const [crfTo, setCrfTo] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clínica form
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [emailEnvio, setEmailEnvio] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [savingClinica, setSavingClinica] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Notificações
  const [notifLembretes, setNotifLembretes] = useState(true)
  const [notifConfirmacoes, setNotifConfirmacoes] = useState(true)
  const [notifRelatorioSemanal, setNotifRelatorioSemanal] = useState(false)
  const [notifAtualizacoes, setNotifAtualizacoes] = useState(true)
  const [savingNotif, setSavingNotif] = useState(false)

  // Google Agenda
  const [googleConnected, setGoogleConnected] = useState(false)
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setCrfTo(profile.crf_to ?? '')
      setBio(profile.bio ?? '')
      setPhone(profile.phone ?? '')
      setAvatarUrl(profile.avatar_url ?? '')
      setCidade(profile.city ?? '')
      setEstado(profile.state ?? '')
      setEmailEnvio(profile.email_envio ?? '')
      setLogoUrl(profile.logo_url ?? '')
      setNotifLembretes(profile.notif_lembretes ?? true)
      setNotifConfirmacoes(profile.notif_confirmacoes ?? true)
      setNotifRelatorioSemanal(profile.notif_relatorio_semanal ?? false)
      setNotifAtualizacoes(profile.notif_atualizacoes ?? true)
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    isGoogleCalendarConnected(user.id).then(setGoogleConnected)
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('google')
    if (status === 'success') {
      setToast({ message: 'Google Agenda conectado!', type: 'success' })
      setActiveTab('notificacoes')
    } else if (status === 'error') {
      setToast({ message: 'Erro ao conectar Google Agenda', type: 'error' })
      setActiveTab('notificacoes')
    }
    if (status) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  function handleConnectGoogle() {
    const redirectUri = `${window.location.origin}/auth/google-calendar-callback`
    window.location.href = getGoogleCalendarAuthUrl(redirectUri)
  }

  async function handleDisconnectGoogle() {
    if (!user) return
    setDisconnectingGoogle(true)
    await disconnectGoogleCalendar(user.id)
    setGoogleConnected(false)
    setDisconnectingGoogle(false)
    setToast({ message: 'Google Agenda desconectado', type: 'success' })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) {
      setToast({ message: 'Erro ao enviar foto', type: 'error' })
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      const ok = await saveToProfile({ avatar_url: url })
      if (ok) {
        setAvatarUrl(url)
        setToast({ message: 'Foto atualizada!', type: 'success' })
      }
    }
    setUploadingPhoto(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (uploadError) {
      setToast({ message: 'Erro ao enviar logo', type: 'error' })
    } else {
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      const ok = await saveToProfile({ logo_url: url })
      if (ok) {
        setLogoUrl(url)
        setToast({ message: 'Logo atualizada!', type: 'success' })
      }
    }
    setUploadingLogo(false)
  }

  // Security form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Email verification
  const [resendingEmail, setResendingEmail] = useState(false)

  // 2FA / TOTP
  const [mfaFactors, setMfaFactors] = useState<{ id: string; status: string }[]>([])
  const [loadingMfa, setLoadingMfa] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [verifyingMfa, setVerifyingMfa] = useState(false)
  const [unenrolling, setUnenrolling] = useState(false)

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Data export (LGPD)
  const [exportingData, setExportingData] = useState(false)

  async function handleExportData() {
    if (!user) return
    setExportingData(true)
    try {
      const [patients, sessions, transactions, records, documents, relatorios] = await Promise.all([
        supabase.from('patients').select('*').eq('user_id', user.id),
        supabase.from('sessions').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('records').select('*').eq('user_id', user.id),
        supabase.from('patient_documents').select('*').eq('user_id', user.id),
        supabase.from('relatorios').select('*').eq('user_id', user.id),
      ])
      const exportPayload = {
        exportado_em: new Date().toISOString(),
        perfil: profile,
        pacientes: patients.data || [],
        sessoes: sessions.data || [],
        transacoes: transactions.data || [],
        prontuarios: records.data || [],
        documentos: documents.data || [],
        relatorios: relatorios.data || [],
      }
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `terapo-pro-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setToast({ message: 'Exportação concluída!', type: 'success' })
    } catch {
      setToast({ message: 'Erro ao exportar dados', type: 'error' })
    } finally {
      setExportingData(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'seguranca') {
      loadMfaFactors()
    }
    if (activeTab === 'indicacoes') {
      loadReferralSummary()
    }
  }, [activeTab])

  async function loadReferralSummary() {
    setLoadingReferral(true)
    const { data, error } = await supabase.rpc('get_referral_summary')
    if (!error && data?.[0]) {
      setReferralSummary(data[0])
      setPixKeyInput(data[0].pix_key || '')
    }
    setLoadingReferral(false)
  }

  async function handleSetReferralMode(mode: 'desconto' | 'comissao') {
    if (!user) return
    setSavingReferral(true)
    const { error } = await supabase.from('profiles').update({ referral_mode: mode }).eq('id', user.id)
    setSavingReferral(false)
    if (error) {
      setToast({ message: 'Erro ao salvar preferência', type: 'error' })
      return
    }
    setToast({ message: 'Preferência salva!', type: 'success' })
    await loadReferralSummary()
  }

  async function handleSavePixKey() {
    if (!user) return
    setSavingReferral(true)
    const { error } = await supabase.from('profiles').update({ pix_key: pixKeyInput.trim() }).eq('id', user.id)
    setSavingReferral(false)
    if (error) {
      setToast({ message: 'Erro ao salvar chave PIX', type: 'error' })
      return
    }
    setToast({ message: 'Chave PIX salva!', type: 'success' })
  }

  function handleCopyReferralLink() {
    if (!referralSummary) return
    navigator.clipboard.writeText(`https://app.terapo.pro/cadastro?ref=${referralSummary.referral_code}`)
    setToast({ message: 'Link copiado!', type: 'success' })
  }

  async function loadMfaFactors() {
    setLoadingMfa(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (!error && data) {
      setMfaFactors(data.totp.map(f => ({ id: f.id, status: f.status })))
    }
    setLoadingMfa(false)
  }

  async function handleResendVerification() {
    if (!user?.email) return
    setResendingEmail(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email })
    setResendingEmail(false)
    if (error) {
      setToast({ message: error.message ?? 'Erro ao reenviar e-mail', type: 'error' })
    } else {
      setToast({ message: 'E-mail de confirmação reenviado!', type: 'success' })
    }
  }

  async function handleStartEnroll() {
    setEnrolling(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setEnrolling(false)
    if (error) {
      setToast({ message: error.message ?? 'Erro ao iniciar 2FA', type: 'error' })
      return
    }
    if (data) {
      setQrCode(data.totp.qr_code)
      setFactorId(data.id)
    }
  }

  async function handleVerifyEnroll() {
    if (!factorId || !mfaCode) return
    setVerifyingMfa(true)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setVerifyingMfa(false)
      setToast({ message: challengeError?.message ?? 'Erro ao verificar código', type: 'error' })
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: mfaCode,
    })
    setVerifyingMfa(false)
    if (verifyError) {
      setToast({ message: verifyError.message ?? 'Código inválido', type: 'error' })
    } else {
      setToast({ message: 'Autenticação em duas etapas ativada!', type: 'success' })
      setQrCode('')
      setFactorId('')
      setMfaCode('')
      await loadMfaFactors()
    }
  }

  async function handleUnenroll(id: string) {
    setUnenrolling(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    setUnenrolling(false)
    if (error) {
      setToast({ message: error.message ?? 'Erro ao desativar 2FA', type: 'error' })
    } else {
      setToast({ message: '2FA desativado.', type: 'success' })
      await loadMfaFactors()
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'EXCLUIR') return
    setDeletingAccount(true)
    const { error } = await supabase.functions.invoke('delete-account')
    setDeletingAccount(false)
    if (error) {
      setToast({ message: 'Erro ao excluir conta', type: 'error' })
    } else {
      await signOut()
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    const ok = await saveToProfile({ full_name: fullName, crf_to: crfTo, bio, phone })
    setSavingProfile(false)
    setToast(ok ? { message: 'Perfil atualizado!', type: 'success' } : { message: 'Erro ao salvar perfil', type: 'error' })
  }

  async function handleSaveClinica() {
    setSavingClinica(true)
    const ok = await saveToProfile({ city: cidade, state: estado, email_envio: emailEnvio })
    setSavingClinica(false)
    setToast(ok ? { message: 'Dados da clínica atualizados!', type: 'success' } : { message: 'Erro ao salvar dados da clínica', type: 'error' })
  }

  async function handleSaveNotif() {
    setSavingNotif(true)
    const ok = await saveToProfile({
      notif_lembretes: notifLembretes,
      notif_confirmacoes: notifConfirmacoes,
      notif_relatorio_semanal: notifRelatorioSemanal,
      notif_atualizacoes: notifAtualizacoes,
    })
    setSavingNotif(false)
    setToast(ok ? { message: 'Preferências de notificação salvas!', type: 'success' } : { message: 'Erro ao salvar notificações', type: 'error' })
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setToast({ message: 'As senhas não coincidem', type: 'error' })
      return
    }
    if (newPassword.length < 8) {
      setToast({ message: 'A senha deve ter pelo menos 8 caracteres', type: 'error' })
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setToast({ message: error.message ?? 'Erro ao alterar senha', type: 'error' })
    } else {
      setToast({ message: 'Senha alterada com sucesso!', type: 'success' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  function handleWhatsappCeo() {
    window.open(getWhatsappCeoUrl('Olá! Tenho interesse no plano Business do Terapô.pro.'), '_blank')
  }

  function handleUpgrade(plan: 'inicial' | 'profissional') {
    if (!user) return
    window.open(getStripeCheckoutUrl(plan, user.id, user.email), '_blank')
  }

  async function handleManageSubscription() {
    setLoadingPortal(true)
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: { return_url: window.location.href },
    })
    setLoadingPortal(false)
    if (error || !data?.url) {
      setToast({ message: 'Não foi possível abrir o portal de gestão da assinatura. Tente novamente.', type: 'error' })
      return
    }
    window.location.href = data.url
  }

  const currentPlan: PlanKey = profile?.plan ?? 'inicial'
  const emailVerificado = !!user?.email_confirmed_at
  const totpVerified = mfaFactors.find(f => f.status === 'verified')

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-green-500 text-white' : 'text-ink-4 hover:bg-green-10'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && (
        <Card className="p-6 max-w-xl">
          <h3 className="font-serif text-lg font-semibold text-ink mb-4">Dados do perfil</h3>
          <div className="flex items-center gap-4 mb-6">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-xl font-bold">
                {fullName?.charAt(0)?.toUpperCase() ?? 'T'}
              </div>
            )}
            <div>
              <Button variant="outline" className="text-sm h-9" onClick={() => fileInputRef.current?.click()} loading={uploadingPhoto}>
                {uploadingPhoto ? '' : 'Alterar foto'}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <p className="text-xs text-ink-5 mt-1">JPG, PNG ou GIF. Máx 2MB.</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input
              label="Nome completo"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
            <Input
              label="Registro profissional"
              value={crfTo}
              onChange={e => setCrfTo(e.target.value)}
              placeholder="ex: TO-SP 12345, CREFITO 12345"
            />
            <Input
              label="Telefone / WhatsApp"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="(51) 99999-9999"
              inputMode="numeric"
            />
            <div>
              <label className="text-sm font-medium text-ink-2 block mb-1">Bio</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none h-24"
                placeholder="Descreva suas especialidades e experiência..."
                value={bio}
                onChange={e => setBio(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile} loading={savingProfile}>
              {savingProfile ? '' : 'Salvar alterações'}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'clinica' && (
        <Card className="p-6 max-w-xl">
          <h3 className="font-serif text-lg font-semibold text-ink mb-4">Dados da clínica</h3>
          <div className="flex items-center gap-4 mb-6">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-green-10 flex items-center justify-center text-green-600">
                <Building2 className="w-7 h-7" />
              </div>
            )}
            <div>
              <Button variant="outline" className="text-sm h-9" onClick={() => logoInputRef.current?.click()} loading={uploadingLogo}>
                {uploadingLogo ? '' : 'Alterar logo'}
              </Button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <p className="text-xs text-ink-5 mt-1">JPG, PNG ou GIF. Máx 2MB.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cidade"
                value={cidade}
                onChange={e => setCidade(e.target.value)}
                placeholder="São Paulo"
              />
              <Input
                label="Estado"
                value={estado}
                onChange={e => setEstado(e.target.value)}
                placeholder="SP"
              />
            </div>
            <Input
              label="E-mail de envio de relatórios"
              type="email"
              value={emailEnvio}
              onChange={e => setEmailEnvio(e.target.value)}
              placeholder="contato@clinica.com.br"
            />
            <Button onClick={handleSaveClinica} disabled={savingClinica} loading={savingClinica}>
              {savingClinica ? '' : 'Salvar alterações'}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'notificacoes' && (
        <Card className="p-6 max-w-xl">
          <h3 className="font-serif text-lg font-semibold text-ink mb-4">Notificações</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-ink">Lembretes de sessão por e-mail</span>
              <Toggle checked={notifLembretes} onChange={setNotifLembretes} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-ink">Confirmação de consulta</span>
              <Toggle checked={notifConfirmacoes} onChange={setNotifConfirmacoes} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-ink">Relatório semanal</span>
              <Toggle checked={notifRelatorioSemanal} onChange={setNotifRelatorioSemanal} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-ink">Atualizações do sistema</span>
              <Toggle checked={notifAtualizacoes} onChange={setNotifAtualizacoes} />
            </div>
          </div>
          <Button className="mt-4" onClick={handleSaveNotif} disabled={savingNotif} loading={savingNotif}>
            {savingNotif ? '' : 'Salvar preferências'}
          </Button>
        </Card>
      )}

      {activeTab === 'notificacoes' && (
        <Card className="p-6 max-w-xl mt-4">
          <h3 className="font-serif text-lg font-semibold text-ink mb-4">Google Agenda</h3>
          {googleConnected ? (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                Conectado ✓
              </span>
              <Button variant="outline" onClick={handleDisconnectGoogle} disabled={disconnectingGoogle} loading={disconnectingGoogle}>
                {disconnectingGoogle ? '' : 'Desconectar'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-4">Conecte sua conta do Google para sincronizar suas sessões com o Google Agenda.</p>
              <Button onClick={handleConnectGoogle}>Conectar</Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'plano' && (
        <div className="max-w-4xl">
          <h3 className="font-serif text-lg font-semibold text-ink mb-4">Seu plano</h3>
          {!hasActiveSubscription && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              Você ainda não assinou nenhum plano. Você tem {FREE_REPORT_LIMIT} relatórios gratuitos para testar a plataforma.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_ORDER.map(key => {
              const info = PLANO_INFO[key]
              const isCurrent = hasActiveSubscription && currentPlan === key
              const isUpgrade = !hasActiveSubscription || PLAN_ORDER.indexOf(key) > PLAN_ORDER.indexOf(currentPlan)
              return (
                <Card key={key} className={`p-6 flex flex-col ${isCurrent ? 'border-2 border-green-500' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-serif font-semibold text-ink">{info.label}</p>
                    {isCurrent && <Badge variant="success">Ativo</Badge>}
                  </div>
                  <p className="text-sm text-ink-4 mb-4">{info.desc}</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {info.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-ink-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button disabled fullWidth>Plano atual</Button>
                  ) : key === 'business' ? (
                    <Button variant="outline" fullWidth onClick={handleWhatsappCeo}>Falar com o time</Button>
                  ) : isUpgrade ? (
                    <Button fullWidth onClick={() => handleUpgrade(key as 'inicial' | 'profissional')}>{hasActiveSubscription ? 'Fazer upgrade' : 'Assinar agora'}</Button>
                  ) : (
                    <Button variant="ghost" fullWidth disabled>Plano anterior</Button>
                  )}
                </Card>
              )
            })}
          </div>
          {hasActiveSubscription && (
            <div className="mt-6">
              <Button variant="outline" onClick={handleManageSubscription} loading={loadingPortal}>
                {loadingPortal ? '' : 'Gerenciar assinatura (cancelar, trocar cartão, ver faturas)'}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'seguranca' && (
        <div className="space-y-4 max-w-xl">
          <Card className="p-6">
            <h3 className="font-serif text-lg font-semibold text-ink mb-4">Verificação de e-mail</h3>
            <div className="flex items-center justify-between p-4 bg-green-10 rounded-xl">
              <div>
                <p className="font-medium text-ink">{user?.email}</p>
                <p className="text-sm text-ink-4">
                  {emailVerificado ? 'E-mail verificado' : 'E-mail não verificado'}
                </p>
              </div>
              {emailVerificado ? (
                <Badge variant="success">Verificado</Badge>
              ) : (
                <Button variant="outline" className="text-sm h-9" onClick={handleResendVerification} loading={resendingEmail}>
                  {resendingEmail ? '' : 'Reenviar confirmação'}
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-serif text-lg font-semibold text-ink mb-4">Alterar senha</h3>
            <div className="space-y-3">
              <Input
                label="Senha atual"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
              <Input
                label="Nova senha"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <Button onClick={handleChangePassword} disabled={savingPassword} loading={savingPassword}>
                {savingPassword ? '' : 'Alterar senha'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-serif text-lg font-semibold text-ink mb-4">Autenticação em duas etapas</h3>
            {loadingMfa ? (
              <p className="text-sm text-ink-4">Carregando...</p>
            ) : totpVerified ? (
              <div className="flex items-center justify-between p-4 bg-green-10 rounded-xl">
                <div>
                  <p className="font-medium text-ink">2FA ativado</p>
                  <p className="text-sm text-ink-4">Sua conta está protegida com autenticação em duas etapas.</p>
                </div>
                <Button variant="outline" className="text-sm h-9" onClick={() => handleUnenroll(totpVerified.id)} loading={unenrolling}>
                  {unenrolling ? '' : 'Desativar'}
                </Button>
              </div>
            ) : qrCode ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-4">Escaneie o QR code com seu app autenticador e digite o código gerado.</p>
                <div className="flex justify-center p-4 bg-gray-50 rounded-xl" dangerouslySetInnerHTML={{ __html: qrCode }} />
                <Input
                  label="Código de verificação"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                />
                <Button onClick={handleVerifyEnroll} disabled={verifyingMfa} loading={verifyingMfa}>
                  {verifyingMfa ? '' : 'Confirmar e ativar'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-ink">2FA desativado</p>
                  <p className="text-sm text-ink-4">Adicione uma camada extra de segurança à sua conta.</p>
                </div>
                <Button variant="outline" className="text-sm h-9" onClick={handleStartEnroll} loading={enrolling}>
                  {enrolling ? '' : 'Ativar 2FA'}
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-serif text-lg font-semibold text-ink mb-2">Exportar meus dados</h3>
            <p className="text-sm text-ink-4 mb-4">
              Baixe uma cópia de todos os seus dados (perfil, pacientes, agenda, financeiro, prontuários,
              documentos e relatórios) em formato JSON, conforme previsto pela LGPD.
            </p>
            <Button variant="outline" className="text-sm h-9" onClick={handleExportData} loading={exportingData}>
              {exportingData ? '' : <><Download size={14} className="mr-1" /> Exportar meus dados</>}
            </Button>
          </Card>

          <Card className="p-6 border-red-100">
            <h3 className="font-serif text-lg font-semibold text-red-600 mb-2">Excluir conta</h3>
            <p className="text-sm text-ink-4 mb-4">
              Esta ação é permanente e removerá todos os seus dados, pacientes, sessões e relatórios. Não é possível desfazer.
            </p>
            <Button variant="outline" className="text-sm h-9 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowDeleteModal(true)}>
              Excluir minha conta
            </Button>
          </Card>
        </div>
      )}

      {activeTab === 'indicacoes' && (
        <div className="max-w-3xl space-y-4">
          {loadingReferral || !referralSummary ? (
            <p className="text-sm text-ink-4">Carregando...</p>
          ) : (
            <>
              <Card className="p-6">
                <h3 className="font-serif text-lg font-semibold text-ink mb-2">Seu link de indicação</h3>
                <p className="text-sm text-ink-4 mb-4">Compartilhe esse link. Quando alguém indicado virar assinante, a indicação conta.</p>
                <div className="flex items-center gap-2">
                  <Input value={`https://app.terapo.pro/cadastro?ref=${referralSummary.referral_code}`} readOnly />
                  <Button variant="outline" onClick={handleCopyReferralLink} className="text-sm h-9 flex-shrink-0">
                    <Copy size={14} className="mr-1" /> Copiar
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-serif text-lg font-semibold text-ink mb-4">Suas indicações</h3>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="text-center p-3 bg-green-10 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">{referralSummary.active_count}</p>
                    <p className="text-xs text-ink-4">Ativas</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl">
                    <p className="text-2xl font-bold text-amber-600">{referralSummary.pending_count}</p>
                    <p className="text-xs text-ink-4">Aguardando</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-500">{referralSummary.canceled_count}</p>
                    <p className="text-xs text-ink-4">Canceladas</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-serif text-lg font-semibold text-ink mb-2">Como quer ser recompensado?</h3>
                <p className="text-sm text-ink-4 mb-4">Escolha um modo. Você pode trocar quando quiser.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handleSetReferralMode('desconto')}
                    disabled={savingReferral}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${referralSummary.referral_mode === 'desconto' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                  >
                    <p className="font-semibold text-sm text-ink">Desconto na minha assinatura</p>
                    <p className="text-xs text-ink-4 mt-1">2% de desconto por indicação ativa, até 20% no máximo.</p>
                  </button>
                  <button
                    onClick={() => handleSetReferralMode('comissao')}
                    disabled={savingReferral}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${referralSummary.referral_mode === 'comissao' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                  >
                    <p className="font-semibold text-sm text-ink">Comissão em dinheiro (afiliado)</p>
                    <p className="text-xs text-ink-4 mt-1">0,5% a 1,5% sobre a mensalidade de cada indicado ativo, pago via PIX.</p>
                  </button>
                </div>

                {referralSummary.referral_mode === 'comissao' && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-10 rounded-xl">
                      <div>
                        <p className="text-sm text-ink-4">Comissão estimada este mês</p>
                        <p className="text-lg font-bold text-green-600">
                          R$ {referralSummary.estimated_commission.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-ink-4">Taxa atual: {referralSummary.tier_rate}% por indicado ativo</p>
                    </div>
                    <Input
                      label="Sua chave PIX para receber"
                      value={pixKeyInput}
                      onChange={e => setPixKeyInput(e.target.value)}
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                    />
                    <Button onClick={handleSavePixKey} disabled={savingReferral} loading={savingReferral} className="text-sm h-9">
                      {savingReferral ? '' : 'Salvar chave PIX'}
                    </Button>
                    <p className="text-xs text-ink-4">O pagamento da comissão é feito manualmente todo mês, com base no valor calculado aqui.</p>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {showDeleteModal && (
        <Modal labelledBy="delete-account-title" onClose={() => { setShowDeleteModal(false); setDeleteConfirmText('') }} maxWidth="max-w-md">
            <h3 id="delete-account-title" className="font-serif text-lg font-semibold text-ink mb-2 pr-6">Excluir conta</h3>
            <p className="text-sm text-ink-4 mb-4">
              Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente apagados.
              Digite <span className="font-bold">EXCLUIR</span> para confirmar.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              className="mb-4"
            />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }} fullWidth>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'EXCLUIR' || deletingAccount}
                loading={deletingAccount}
                fullWidth
              >
                {deletingAccount ? '' : 'Excluir definitivamente'}
              </Button>
            </div>
        </Modal>
      )}

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
