import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { flushSync } from 'react-dom'
import { Plus, FileText, Sparkles, Download, Edit2, Check, X, MessageCircle, RefreshCw, ChevronLeft, Lock, PenLine } from 'lucide-react'
import { PLAN_LIMITS, FREE_REPORT_LIMIT } from '../../lib/planLimits'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { gerarRelatorio, gerarResumoFamiliar, traduzirErroAPI } from '../../lib/anthropic'
import { gerarPDF } from '../../lib/generatePDF'
import { extrairCores, defaultBrandColors } from '../../lib/brandColors'
import type { BrandColors } from '../../lib/brandColors'
import { formatarData } from '../../lib/formatDate'
import { track } from '../../lib/analytics'
import type { RelatorioGerado, EdicaoRelatorio, Patient } from '../../types'
import { WizardStep1 } from '../../components/relatorio/WizardStep1'
import { WizardStep2 } from '../../components/relatorio/WizardStep2'
import { RelatorioPreview } from '../../components/relatorio/RelatorioPreview'
import { RelatorioCard } from '../../components/relatorio/RelatorioCard'
import { ModalEmail } from '../../components/relatorio/ModalEmail'
import { ModalExcluir } from '../../components/relatorio/ModalExcluir'
import { UpgradeModal } from '../../components/relatorio/UpgradeModal'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { SignaturePad } from '../../components/ui/SignaturePad'
import { Toast } from '../../components/ui/Toast'
import ReactMarkdown from 'react-markdown'

interface DadosWizard {
  paciente?: { id: string; name: string; email: string }
  tipo?: 'evolucao' | 'avaliacao' | 'alta' | 'encaminhamento'
  financiamento?: 'convenio' | 'particular'
  cidPrincipal?: string
  cidSecundario?: string
  cif?: string
  tuss?: string
  periodoInicio?: string
  periodoFim?: string
}

export function Relatorios() {
  const { profile, user, hasActiveSubscription, freeReportsUsed, refreshProfile } = useAuth()
  const nomeTerapeuta = profile?.full_name || 'Terapeuta'
  const crfto = profile?.crf_to || ''

  const [tela, setTela] = useState<'lista' | 'wizard' | 'resultado'>('lista')
  const [passo, setPasso] = useState(1)
  const [dadosWizard, setDadosWizard] = useState<DadosWizard>({})
  const [briefing, setBriefing] = useState('')
  const [relatorios, setRelatorios] = useState<RelatorioGerado[]>([])
  const [loadingRelatorios, setLoadingRelatorios] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])

  const [relatorioAtual, setRelatorioAtual] = useState<RelatorioGerado | null>(null)
  const [conteudoEditado, setConteudoEditado] = useState('')
  const [editando, setEditando] = useState(false)
  const [resumoFamiliar, setResumoFamiliar] = useState('')
  const [mostrarResumo, setMostrarResumo] = useState(false)

  const [gerando, setGerando] = useState(false)
  const [gerandoResumo, setGerandoResumo] = useState(false)
  const [erro, setErro] = useState('')

  const [brandColors, setBrandColors] = useState<BrandColors>(defaultBrandColors)
  const [logoUrl, setLogoUrl] = useState<string | undefined>()
  const logoRef = useRef<HTMLImageElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [modalEmail, setModalEmail] = useState<RelatorioGerado | null>(null)
  const [modalExcluir, setModalExcluir] = useState<RelatorioGerado | null>(null)
  const [showReportLimitModal, setShowReportLimitModal] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [visibleCount, setVisibleCount] = useState(12)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [assinaturaUrl, setAssinaturaUrl] = useState<string | undefined>()
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [showFirstReportCelebration, setShowFirstReportCelebration] = useState(false)

  async function fetchRelatorios() {
    if (!user) return
    setLoadingRelatorios(true)
    const { data, error } = await supabase
      .from('relatorios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error && data) {
      setRelatorios(data as RelatorioGerado[])
    }
    setLoadingRelatorios(false)
  }

  async function fetchPatients() {
    if (!user) return
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
    if (!error && data) {
      setPatients(data as Patient[])
    }
  }

  useEffect(() => { fetchRelatorios(); fetchPatients() }, [user])

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setToast({ message: 'Selecione um arquivo de imagem (PNG ou JPG).', type: 'error' })
      return
    }
    if (logoUrl) URL.revokeObjectURL(logoUrl)
    const url = URL.createObjectURL(file)
    setLogoUrl(url)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      const cores = await extrairCores(img)
      setBrandColors(cores)
    }
    img.src = url
  }

  function handleRemoveLogo() {
    if (logoUrl) URL.revokeObjectURL(logoUrl)
    setLogoUrl(undefined)
    setBrandColors(defaultBrandColors)
  }

  async function handleGerar() {
    const { paciente, tipo, financiamento, cidPrincipal } = dadosWizard
    const isClinical = profile?.is_clinical ?? true
    if (!user || !paciente || !tipo) return
    if (isClinical && (!financiamento || !cidPrincipal)) return
    const isPrimeiroRelatorio = relatorios.length === 0
    setGerando(true)
    setErro('')
    try {
      const pacienteCompleto = patients.find(p => p.id === paciente.id)
      const conteudo = await gerarRelatorio({
        nomePaciente: paciente.name,
        dataNascimento: pacienteCompleto?.birth_date ? formatarData(pacienteCompleto.birth_date) : undefined,
        tipoRelatorio: tipo,
        isClinical,
        especialidadeNome: profile?.specialty_name,
        financiamento,
        cidPrincipal,
        cidSecundario: dadosWizard.cidSecundario,
        cif: dadosWizard.cif,
        tuss: dadosWizard.tuss,
        periodoInicio: dadosWizard.periodoInicio || '',
        periodoFim: dadosWizard.periodoFim || '',
        briefing,
        nomeTerapeuta,
        crfto,
      })
      const agora = new Date()
      const novoRel = {
        user_id: user.id,
        patient_name: paciente.name,
        patient_id: paciente.id,
        tipo,
        financiamento,
        cid_principal: cidPrincipal,
        cid_secundario: dadosWizard.cidSecundario || '',
        cif: dadosWizard.cif || '',
        tuss: dadosWizard.tuss,
        conteudo,
        conteudo_original: conteudo,
        data_geracao: formatarData(agora),
        hora_geracao: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
        periodo_inicio: dadosWizard.periodoInicio || '',
        periodo_fim: dadosWizard.periodoFim || '',
        validado: false,
        historico_edicoes: [],
      }
      const { data, error } = await supabase.from('relatorios').insert(novoRel).select().single()
      if (error || !data) throw new Error('Erro ao salvar relatório')
      const rel = data as RelatorioGerado
      setRelatorioAtual(rel)
      setConteudoEditado(rel.conteudo)
      setResumoFamiliar('')
      setMostrarResumo(false)
      setEditando(false)
      setRelatorios(prev => [rel, ...prev])
      setTela('resultado')
      if (isPrimeiroRelatorio) {
        setShowFirstReportCelebration(true)
        track('first_report_generated')
      }
      if (!hasActiveSubscription) await refreshProfile()
    } catch (e) {
      setErro(traduzirErroAPI(e as Error))
    } finally {
      setGerando(false)
    }
  }

  async function handleGerarResumo() {
    if (!relatorioAtual) return
    setGerandoResumo(true)
    try {
      const resumo = await gerarResumoFamiliar({
        nomePaciente: relatorioAtual.patient_name,
        tipoRelatorio: relatorioAtual.tipo,
        relatorioTecnico: conteudoEditado,
        nomeTerapeuta,
        especialidade: profile?.specialty_name,
      })
      setResumoFamiliar(resumo)
      setMostrarResumo(true)
      await supabase.from('relatorios').update({ resumo_familiar: resumo }).eq('id', relatorioAtual.id)
      const atualizado = { ...relatorioAtual, resumo_familiar: resumo }
      setRelatorioAtual(atualizado)
      setRelatorios(prev => prev.map(r => r.id === atualizado.id ? atualizado : r))
    } catch (e) {
      setErro(traduzirErroAPI(e as Error))
    } finally {
      setGerandoResumo(false)
    }
  }

  async function handleSalvarEdicao() {
    if (!relatorioAtual) return
    const agora = new Date()
    const edicao: EdicaoRelatorio = {
      data: formatarData(agora),
      hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
      autor: nomeTerapeuta,
      descricao: 'Edição manual',
    }
    const atualizado: RelatorioGerado = {
      ...relatorioAtual,
      conteudo: conteudoEditado,
      historico_edicoes: [...relatorioAtual.historico_edicoes, edicao],
    }
    const { error } = await supabase
      .from('relatorios')
      .update({ conteudo: atualizado.conteudo, historico_edicoes: atualizado.historico_edicoes })
      .eq('id', atualizado.id)
    if (error) {
      setErro('Erro ao salvar edição')
      return
    }
    setRelatorioAtual(atualizado)
    setRelatorios(prev => prev.map(r => r.id === atualizado.id ? atualizado : r))
    setEditando(false)
  }

  function handleCancelarEdicao() {
    setConteudoEditado(relatorioAtual?.conteudo || '')
    setEditando(false)
  }

  function handleVisualizar(rel: RelatorioGerado) {
    setRelatorioAtual(rel)
    setConteudoEditado(rel.conteudo)
    setEditando(false)
    setResumoFamiliar(rel.resumo_familiar || '')
    setMostrarResumo(!!rel.resumo_familiar)
    setAssinaturaUrl(undefined)
    setTela('resultado')
  }

  function ensureVisualizando(rel: RelatorioGerado) {
    if (relatorioAtual?.id !== rel.id || tela !== 'resultado') {
      flushSync(() => handleVisualizar(rel))
    }
  }

  async function handleDownload(rel: RelatorioGerado) {
    ensureVisualizando(rel)
    const nomeArquivo = `relatorio_${rel.patient_name.replace(/\s+/g, '_')}_${rel.data_geracao.replace(/\//g, '-')}`
    await gerarPDF({
      nomeArquivo,
      conteudo: rel.conteudo,
      nomePaciente: rel.patient_name,
      nomeTerapeuta,
      crfto,
      cidPrincipal: rel.cid_principal,
      financiamento: rel.financiamento,
      especialidade: profile?.specialty_name,
      tuss: rel.tuss,
      periodoInicio: rel.periodo_inicio,
      periodoFim: rel.periodo_fim,
      tipoRelatorio: rel.tipo,
      brandColors,
      assinaturaUrl,
    })
  }

  async function handleEnviarEmail(rel: RelatorioGerado, dados: { para: string; cc: string; assunto: string; mensagem: string }) {
    ensureVisualizando(rel)
    setEnviandoEmail(true)
    try {
      const nomeArquivo = `relatorio_${rel.patient_name.replace(/\s+/g, '_')}_${rel.data_geracao.replace(/\//g, '-')}`
      const pdfBase64 = await gerarPDF({
        nomeArquivo,
        conteudo: rel.conteudo,
        nomePaciente: rel.patient_name,
        nomeTerapeuta,
        crfto,
        cidPrincipal: rel.cid_principal,
        financiamento: rel.financiamento,
        especialidade: profile?.specialty_name,
        tuss: rel.tuss,
        periodoInicio: rel.periodo_inicio,
        periodoFim: rel.periodo_fim,
        tipoRelatorio: rel.tipo,
        brandColors,
        assinaturaUrl,
        output: 'base64',
      })
      const { error } = await supabase.functions.invoke('send-report-email', {
        body: { to: dados.para, cc: dados.cc || undefined, subject: dados.assunto, message: dados.mensagem, pdfBase64, filename: `${nomeArquivo}.pdf` },
      })
      if (error) throw error
      setToast({ message: 'E-mail enviado com sucesso!', type: 'success' })
      setModalEmail(null)
    } catch {
      setToast({ message: 'Erro ao enviar e-mail. Tente novamente.', type: 'error' })
    } finally {
      setEnviandoEmail(false)
    }
  }

  function handleWhatsApp(rel: RelatorioGerado) {
    const texto = encodeURIComponent(
      `Olá! Segue o relatório de ${rel.tipo} de ${rel.patient_name}, gerado em ${rel.data_geracao}.\n\n— ${nomeTerapeuta}`
    )
    window.open(`https://wa.me/?text=${texto}`, '_blank')
  }

  async function handleExcluir(rel: RelatorioGerado) {
    const { error } = await supabase.from('relatorios').delete().eq('id', rel.id)
    if (error) {
      setErro('Erro ao excluir relatório')
      return
    }
    setRelatorios(prev => prev.filter(r => r.id !== rel.id))
    if (relatorioAtual?.id === rel.id) {
      setTela('lista')
      setRelatorioAtual(null)
    }
    setModalExcluir(null)
  }

  function novoRelatorio() {
    if (reportLimitReached) {
      if (!hasActiveSubscription) setShowUpgradeModal(true)
      return
    }
    setDadosWizard({})
    setBriefing('')
    setPasso(1)
    setTela('wizard')
  }

  const plan = profile?.plan ?? 'inicial'
  const planLabel = plan === 'inicial' ? 'Inicial' : plan === 'profissional' ? 'Profissional' : 'Business'

  const now = new Date()
  const reportsThisMonth = relatorios.filter(r => {
    const createdAt = new Date(r.created_at)
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
  })

  // Quem ainda não assinou usa os 5 relatórios gratuitos vitalícios em vez do limite mensal do plano.
  const reportLimit = hasActiveSubscription ? PLAN_LIMITS[plan].reportsPerMonth : FREE_REPORT_LIMIT
  const reportsUsedForLimit = hasActiveSubscription ? reportsThisMonth.length : freeReportsUsed
  const reportLimitReached = reportsUsedForLimit >= reportLimit
  const isUnlimited = !Number.isFinite(reportLimit)
  const reportUsagePercent = isUnlimited ? 0 : Math.min(100, (reportsUsedForLimit / reportLimit) * 100)
  const reportNearLimit = !isUnlimited && reportUsagePercent >= 90 && !reportLimitReached
  const reportBarColor = reportUsagePercent >= 100 ? 'bg-red-500' : reportUsagePercent >= 90 ? 'bg-amber-500' : 'bg-green-500'

  // ── LISTA ─────────────────────────────────────────────────────────────────────
  if (tela === 'lista') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-gray-800">Relatórios</h1>
            <p className="text-sm text-gray-500 mt-1">{relatorios.length} relatório{relatorios.length !== 1 ? 's' : ''} gerado{relatorios.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => logoInputRef.current?.click()}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-full text-sm text-gray-600 hover:border-green-300 hover:text-green-600 transition-all"
            >
              {logoUrl && <img src={logoUrl} alt="" className="w-5 h-5 rounded object-contain" />}
              {logoUrl ? 'Logo' : '+ Logo'}
            </button>
            {logoUrl && (
              <button
                onClick={handleRemoveLogo}
                className="hidden md:flex items-center text-xs text-gray-400 hover:text-red-500 transition-all"
                title="Remover logo"
              >
                Remover
              </button>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <button
              onClick={novoRelatorio}
              disabled={reportLimitReached}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Novo relatório
            </button>
          </div>
        </div>

        {!isUnlimited && (
          <div>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>
                {hasActiveSubscription
                  ? `${reportsUsedForLimit} de ${reportLimit} relatórios este mês (plano ${planLabel})`
                  : `${reportsUsedForLimit} de ${reportLimit} relatórios gratuitos usados`}
              </span>
              <span>{Math.round(reportUsagePercent)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${reportBarColor}`} style={{ width: `${reportUsagePercent}%` }} />
            </div>
          </div>
        )}

        {reportLimitReached && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              {hasActiveSubscription
                ? `Você atingiu o limite de ${reportLimit} relatórios neste mês do plano ${planLabel}. Faça upgrade para gerar mais.`
                : `Você usou seus ${reportLimit} relatórios gratuitos. Assine um plano para continuar gerando relatórios.`}
            </span>
            <a href="/configuracoes" className="font-medium underline whitespace-nowrap">Fazer upgrade</a>
          </div>
        )}

        {loadingRelatorios ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : relatorios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mb-4">
              <FileText size={28} className="text-green-500" />
            </div>
            <h3 className="font-serif font-semibold text-gray-700 text-lg mb-1">Nenhum relatório ainda</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">Crie seu primeiro relatório clínico com IA em menos de 2 minutos.</p>
            <button onClick={novoRelatorio} className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-400 transition-all">
              <Sparkles size={16} /> Gerar primeiro relatório
            </button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {relatorios.slice(0, visibleCount).map(rel => (
                <RelatorioCard
                  key={rel.id}
                  relatorio={rel}
                  onVisualizar={() => handleVisualizar(rel)}
                  onDownload={() => handleDownload(rel)}
                  onEmail={() => { ensureVisualizando(rel); setModalEmail(rel) }}
                  onWhatsApp={() => handleWhatsApp(rel)}
                  onExcluir={() => setModalExcluir(rel)}
                />
              ))}
            </div>
            {relatorios.length > visibleCount && (
              <div className="flex justify-center">
                <button
                  onClick={() => setVisibleCount(c => c + 12)}
                  className="px-5 py-2.5 border border-gray-200 rounded-full text-sm text-gray-600 hover:border-green-300 hover:text-green-600 transition-all"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}

        {modalExcluir && (
          <ModalExcluir
            nomePaciente={modalExcluir.patient_name}
            dataGeracao={modalExcluir.data_geracao}
            onConfirmar={() => handleExcluir(modalExcluir)}
            onCancelar={() => setModalExcluir(null)}
          />
        )}

        {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}

        {showFirstReportCelebration && (
          <Modal onClose={() => setShowFirstReportCelebration(false)} maxWidth="max-w-md" className="text-center">
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="text-5xl mb-4"
            >
              🎉
            </motion.div>
            <h2 className="font-serif text-xl font-bold text-ink mb-2">Seu primeiro relatório está pronto!</h2>
            <p className="text-ink-4 text-sm mb-6">
              Escrever isso do zero levaria de 20 a 30 minutos. Você acabou de economizar esse tempo — e isso vai se repetir em cada relatório daqui pra frente.
            </p>
            <Button fullWidth onClick={() => setShowFirstReportCelebration(false)}>Continuar</Button>
          </Modal>
        )}

        {reportNearLimit && showReportLimitModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-semibold text-gray-800 text-lg">Quase no limite</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Você já usou {reportsThisMonth.length} de {reportLimit} relatórios ({Math.round(reportUsagePercent)}%) este mês no plano {planLabel}.
                Faça upgrade para um plano com mais relatórios ou aguarde a virada do mês para renovar seu limite.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowReportLimitModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm font-bold text-gray-600 hover:border-green-300 transition-all">
                  Aguardar próximo mês
                </button>
                <button onClick={() => { window.location.href = '/configuracoes' }} className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-400 transition-all">
                  Fazer upgrade
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
      </div>
    )
  }

  // ── WIZARD ────────────────────────────────────────────────────────────────────
  if (tela === 'wizard') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => passo === 1 ? setTela('lista') : setPasso(1)} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 flex gap-2">
            {[1, 2].map(n => (
              <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n <= passo ? 'bg-green-500' : 'bg-gray-100'}`} />
            ))}
          </div>
          <span className="text-xs text-gray-400 font-medium">{passo}/2</span>
        </div>

        {passo === 1 && (
          <WizardStep1 dados={dadosWizard} onChange={setDadosWizard} onProximo={() => setPasso(2)} patients={patients} isClinical={profile?.is_clinical} />
        )}
        {passo === 2 && (
          <>
            <WizardStep2 briefing={briefing} onChange={setBriefing} onVoltar={() => setPasso(1)} onGerar={handleGerar} />
            {gerando && (
              <div className="flex items-center justify-center gap-3 py-4 text-green-600">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Gerando relatório com IA...</span>
              </div>
            )}
            {erro && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">❌ {erro}</div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── RESULTADO ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => setTela('lista')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft size={18} /> Todos os relatórios
        </button>
        <div className="flex items-center gap-2">
          {editando ? (
            <>
              <button onClick={handleSalvarEdicao} className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-400">
                <Check size={14} /> Salvar
              </button>
              <button onClick={handleCancelarEdicao} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50">
                <X size={14} /> Cancelar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditando(true)} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50">
                <Edit2 size={13} /> Editar
              </button>
              <button
                onClick={handleGerarResumo}
                disabled={gerandoResumo}
                className="flex items-center gap-1.5 px-4 py-2 border border-green-200 bg-green-50 text-green-700 rounded-full text-xs font-semibold hover:bg-green-100 disabled:opacity-50"
              >
                {gerandoResumo
                  ? <div className="w-3 h-3 border border-green-500 border-t-transparent rounded-full animate-spin" />
                  : <Sparkles size={13} />}
                Resumo familiar
              </button>
              <button
                onClick={() => setShowSignaturePad(true)}
                className={`flex items-center gap-1.5 px-4 py-2 border rounded-full text-xs font-semibold ${assinaturaUrl ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <PenLine size={13} /> {assinaturaUrl ? 'Assinado' : 'Assinatura'}
              </button>
              <button
                onClick={() => relatorioAtual && setModalEmail(relatorioAtual)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-green-300 hover:text-green-600"
                title="E-mail"
              >
                <span className="text-xs">✉</span>
              </button>
              <button
                onClick={() => relatorioAtual && handleWhatsApp(relatorioAtual)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-green-300 hover:text-green-600"
                title="WhatsApp"
              >
                <MessageCircle size={14} />
              </button>
              <button
                onClick={() => relatorioAtual && handleDownload(relatorioAtual)}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-400"
              >
                <Download size={13} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      <button
        onClick={novoRelatorio}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-green-300 text-green-600 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors"
      >
        <RefreshCw size={14} /> Gerar novo relatório
      </button>

      {relatorioAtual && (
        <RelatorioPreview
          id="relatorio-preview"
          conteudo={conteudoEditado}
          editando={editando}
          onChange={setConteudoEditado}
          nomePaciente={relatorioAtual.patient_name}
          nomeTerapeuta={nomeTerapeuta}
          crfto={crfto}
          cidPrincipal={relatorioAtual.cid_principal}
          financiamento={relatorioAtual.financiamento}
          especialidade={profile?.specialty_name}
          tuss={relatorioAtual.tuss}
          periodoInicio={relatorioAtual.periodo_inicio}
          periodoFim={relatorioAtual.periodo_fim}
          logoUrl={logoUrl}
          logoRef={logoRef}
          brandColors={brandColors}
          tipoRelatorio={relatorioAtual.tipo}
        />
      )}

      {mostrarResumo && resumoFamiliar && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-blue-800 text-sm">Resumo para a Família</h3>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">✨ Gerado por IA — revise antes de enviar</span>
            </div>
            <button onClick={() => setMostrarResumo(false)} className="text-blue-400 hover:text-blue-600"><X size={16} /></button>
          </div>
          <div className="text-sm text-blue-700 leading-relaxed [&_h2]:font-bold [&_h2]:text-blue-800 [&_h2]:text-base [&_h2]:mt-4 [&_h2]:mb-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:ml-5 [&_p]:mb-2">
            <ReactMarkdown>{resumoFamiliar}</ReactMarkdown>
          </div>
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(resumoFamiliar)}`, '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-400"
          >
            <MessageCircle size={13} /> Enviar pelo WhatsApp
          </button>
        </div>
      )}

      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">❌ {erro}</div>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400">
        {logoUrl && <img src={logoUrl} alt="Logo atual" className="w-8 h-8 rounded border border-gray-200 object-contain bg-white" />}
        <button onClick={() => logoInputRef.current?.click()} className="hover:text-green-600 underline">
          {logoUrl ? 'Trocar logo' : '+ Adicionar logo ao relatório'}
        </button>
        {logoUrl && (
          <button onClick={handleRemoveLogo} className="hover:text-red-500 underline">
            Remover logo
          </button>
        )}
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
      </div>

        {showSignaturePad && (
          <SignaturePad
            nomeTerapeuta={nomeTerapeuta}
            onConfirm={dataUrl => { setAssinaturaUrl(dataUrl); setShowSignaturePad(false) }}
            onSkip={() => { setAssinaturaUrl(undefined); setShowSignaturePad(false) }}
            onClose={() => setShowSignaturePad(false)}
          />
        )}

      {modalEmail && relatorioAtual && (
        <ModalEmail
          nomePaciente={relatorioAtual.patient_name}
          nomeTerapeuta={nomeTerapeuta}
          crfto={crfto}
          emailTerapeuta={user?.email}
          tipoRelatorio={relatorioAtual.tipo}
          dataGeracao={relatorioAtual.data_geracao}
          enviando={enviandoEmail}
          onEnviar={(dados) => handleEnviarEmail(relatorioAtual, dados)}
          onFechar={() => setModalEmail(null)}
        />
      )}

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
