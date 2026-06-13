import { useState, useRef, useEffect } from 'react'
import {
  FileText, Plus, Download, Mail, Eye, Mic, MicOff, Sparkles,
  ChevronLeft, X, TrendingUp, ClipboardList, GraduationCap, Send,
  CheckCircle2, RefreshCw, Pencil, Loader2, Upload,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Toast } from '../../components/ui/Toast'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../contexts/AuthContext'
import { gerarRelatorio } from '../../lib/anthropic'
import { gerarPDF } from '../../lib/generatePDF'

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoRelatorio = 'evolucao' | 'avaliacao' | 'alta' | 'encaminhamento'

interface RelatorioGerado {
  id: string
  patient_name: string
  patient_id: string
  tipo: TipoRelatorio
  conteudo: string
  data_geracao: string
  periodo_inicio: string
  periodo_fim: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'terapo_relatorios'

const relatoriosMock: RelatorioGerado[] = [
  {
    id: '1',
    patient_name: 'Maria Aparecida Santos',
    patient_id: '1',
    tipo: 'evolucao',
    conteudo:
      '1. IDENTIFICAÇÃO DO PACIENTE\nMaria Aparecida Santos, 42 anos.\n\n2. OBJETIVO DO RELATÓRIO\nDescrever a evolução clínica durante o período de acompanhamento.\n\n3. HISTÓRICO E CONTEXTO CLÍNICO\nPaciente em acompanhamento de Terapia Ocupacional há 3 meses, com foco em reabilitação das atividades de vida diária.',
    data_geracao: '28/04/2025',
    periodo_inicio: '01/04/2025',
    periodo_fim: '28/04/2025',
  },
  {
    id: '2',
    patient_name: 'João Pedro Almeida',
    patient_id: '2',
    tipo: 'avaliacao',
    conteudo:
      '1. IDENTIFICAÇÃO DO PACIENTE\nJoão Pedro Almeida, 8 anos.\n\n2. OBJETIVO DO RELATÓRIO\nAvaliação inicial das habilidades funcionais e de desempenho ocupacional.\n\n3. HISTÓRICO E CONTEXTO CLÍNICO\nEncaminhado pela escola devido a dificuldades de integração sensorial e atenção.',
    data_geracao: '25/04/2025',
    periodo_inicio: '25/04/2025',
    periodo_fim: '25/04/2025',
  },
  {
    id: '3',
    patient_name: 'Carla Beatriz Lima',
    patient_id: '3',
    tipo: 'encaminhamento',
    conteudo:
      '1. IDENTIFICAÇÃO DO PACIENTE\nCarla Beatriz Lima, 31 anos.\n\n2. OBJETIVO DO RELATÓRIO\nEncaminhamento para avaliação neurológica especializada.\n\n3. HISTÓRICO E CONTEXTO CLÍNICO\nPaciente apresenta quadro de déficits cognitivos progressivos que requerem avaliação multidisciplinar.',
    data_geracao: '20/04/2025',
    periodo_inicio: '01/03/2025',
    periodo_fim: '20/04/2025',
  },
]

const pacientesMock = [
  { id: '1', nome: 'Maria Aparecida Santos', email: 'maria@email.com' },
  { id: '2', nome: 'João Pedro Almeida', email: 'joao@email.com' },
  { id: '3', nome: 'Carla Beatriz Lima', email: 'carla@email.com' },
  { id: '4', nome: 'Roberto Costa', email: 'roberto@email.com' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tipoLabel: Record<TipoRelatorio, string> = {
  evolucao: 'Evolução',
  avaliacao: 'Avaliação',
  alta: 'Alta',
  encaminhamento: 'Encaminhamento',
}

const tipoBadge: Record<TipoRelatorio, 'success' | 'warning' | 'danger' | 'neutral'> = {
  evolucao: 'success',
  avaliacao: 'neutral',
  alta: 'warning',
  encaminhamento: 'danger',
}

const loadingMessages = [
  'Analisando as informações da sessão...',
  'Estruturando o relatório clínico...',
  'Aplicando linguagem técnica de TO...',
  'Revisando e finalizando o documento...',
]

function hoje() {
  return new Date().toLocaleDateString('pt-BR')
}

function slugData() {
  return new Date().toISOString().slice(0, 10)
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const steps = ['Informações', 'Briefing', 'Relatório']
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i <= step ? 'text-green-600' : 'text-gray-400'}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Document preview ─────────────────────────────────────────────────────────

function RelatorioPrint({
  conteudo, nomePaciente, tipo, data, nomeTerapeuta, crfTo, logoUrl,
}: {
  conteudo: string
  nomePaciente: string
  tipo: string
  data: string
  nomeTerapeuta: string
  crfTo: string
  logoUrl: string
}) {
  const sections = conteudo.split('\n\n').filter(Boolean)

  return (
    <div className="font-sans text-gray-800 text-sm leading-relaxed">
      <div className="flex items-start justify-between mb-4">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-14 object-contain" />
        ) : (
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center">
            <FileText size={24} className="text-green-500" />
          </div>
        )}
        <div className="text-right text-xs text-gray-500">
          <p className="font-semibold text-gray-700">{nomeTerapeuta || 'Terapeuta Ocupacional'}</p>
          {crfTo && <p>CRF/TO {crfTo}</p>}
        </div>
      </div>

      <hr className="border-gray-300 mb-4" />

      <h1 className="text-center text-xl font-bold text-gray-900 mb-1">
        RELATÓRIO DE {tipo.toUpperCase()}
      </h1>
      <p className="text-center text-gray-600 text-sm mb-1">Paciente: {nomePaciente}</p>
      <p className="text-center text-xs text-gray-400 mb-6">{data}</p>

      {sections.map((section, i) => {
        const lines = section.split('\n')
        const firstLine = lines[0]
        const isHeader = /^\d+\./.test(firstLine)
        return (
          <div key={i} className="mb-4">
            {isHeader ? (
              <>
                <p className="font-bold text-gray-900 mb-1">{firstLine}</p>
                {lines.slice(1).map((l, j) => l && <p key={j} className="text-gray-700 mb-1">{l}</p>)}
              </>
            ) : (
              lines.map((l, j) => l && <p key={j} className="text-gray-700 mb-1">{l}</p>)
            )}
          </div>
        )
      })}

      <hr className="border-gray-200 mt-8 mb-3" />
      <p className="text-center text-xs text-gray-400">Documento gerado pelo Terapô.pro</p>
    </div>
  )
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({
  emailPara, setEmailPara, emailCC, setEmailCC,
  emailAssunto, setEmailAssunto, emailMensagem, setEmailMensagem,
  onClose, onSend,
}: {
  emailPara: string; setEmailPara: (v: string) => void
  emailCC: string; setEmailCC: (v: string) => void
  emailAssunto: string; setEmailAssunto: (v: string) => void
  emailMensagem: string; setEmailMensagem: (v: string) => void
  onClose: () => void; onSend: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink text-lg">Enviar por e-mail</h3>
          <button onClick={onClose}><X size={18} className="text-ink-4" /></button>
        </div>
        <Input label="Para:" type="email" value={emailPara} onChange={(e) => setEmailPara(e.target.value)} />
        <Input label="CC (opcional):" type="email" value={emailCC} onChange={(e) => setEmailCC(e.target.value)} />
        <Input label="Assunto:" value={emailAssunto} onChange={(e) => setEmailAssunto(e.target.value)} />
        <div>
          <label className="text-sm font-medium text-ink-2 block mb-1">Mensagem:</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none h-36"
            value={emailMensagem}
            onChange={(e) => setEmailMensagem(e.target.value)}
          />
        </div>
        <p className="text-xs text-ink-4">O PDF será anexado automaticamente ao e-mail.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSend}><Send size={14} className="mr-1" /> Enviar e-mail</Button>
        </div>
      </Card>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Relatorios() {
  const { profile } = useAuth()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [relatorios, setRelatorios] = useState<RelatorioGerado[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : relatoriosMock
    } catch {
      return relatoriosMock
    }
  })

  const [criando, setCriando] = useState(false)
  const [step, setStep] = useState(0)

  // Step 0
  const [pacienteSelecionado, setPacienteSelecionado] = useState<typeof pacientesMock[0] | null>(null)
  const [tipo, setTipo] = useState<TipoRelatorio | null>(null)
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')
  const [buscaPaciente, setBuscaPaciente] = useState('')

  // Step 1
  const [tabEntrada, setTabEntrada] = useState<'texto' | 'audio'>('texto')
  const [briefing, setBriefing] = useState('')
  const [audioState, setAudioState] = useState<'idle' | 'recording' | 'done'>('idle')
  const [audioTimer, setAudioTimer] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Step 2
  const [generating, setGenerating] = useState(false)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [relatorioGerado, setRelatorioGerado] = useState('')
  const [geradoEm, setGeradoEm] = useState(0)
  const [logoUrl, setLogoUrl] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [nomeTerapeuta, setNomeTerapeuta] = useState('')
  const [crfTo, setCrfTo] = useState('')

  // Email modal
  const [emailModal, setEmailModal] = useState(false)
  const [emailPara, setEmailPara] = useState('')
  const [emailCC, setEmailCC] = useState('')
  const [emailAssunto, setEmailAssunto] = useState('')
  const [emailMensagem, setEmailMensagem] = useState('')

  // Viewer modal
  const [viewerRelatorio, setViewerRelatorio] = useState<RelatorioGerado | null>(null)

  useEffect(() => {
    if (profile) {
      setNomeTerapeuta(profile.full_name ?? '')
      setCrfTo(profile.crf_to ?? '')
    }
  }, [profile])

  function saveRelatorios(list: RelatorioGerado[]) {
    setRelatorios(list)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }

  function stopRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(recognitionRef.current as any)?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function resetWizard() {
    stopRecording()
    setCriando(false)
    setStep(0)
    setPacienteSelecionado(null)
    setTipo(null)
    setPeriodoInicio('')
    setPeriodoFim('')
    setBuscaPaciente('')
    setBriefing('')
    setAudioState('idle')
    setAudioTimer(0)
    setRelatorioGerado('')
    setProgress(0)
    setEmailModal(false)
  }

  function startRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      setToast({ message: 'Seu navegador não suporta gravação de áudio', type: 'error' })
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true
    let finalText = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t + ' '
        else interim += t
      }
      setBriefing(finalText + interim)
    }
    rec.onerror = () => {
      setAudioState('idle')
      setToast({ message: 'Erro ao acessar microfone', type: 'error' })
    }
    rec.onend = () => {
      setAudioState('done')
      if (timerRef.current) clearInterval(timerRef.current)
    }
    recognitionRef.current = rec
    rec.start()
    setAudioState('recording')
    setAudioTimer(0)
    timerRef.current = setInterval(() => setAudioTimer((t) => t + 1), 1000)
  }

  function formatTimer(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  async function handleGerar() {
    if (!pacienteSelecionado || !tipo || !briefing.trim()) return
    setStep(2)
    setGenerating(true)
    setProgress(0)
    setLoadingMsgIdx(0)

    const t0 = Date.now()
    const progInterval = setInterval(() => setProgress((p) => Math.min(p + 1.2, 95)), 100)
    const msgInterval = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % loadingMessages.length), 2000)

    try {
      const texto = await gerarRelatorio(briefing, tipoLabel[tipo], pacienteSelecionado.nome)
      clearInterval(progInterval)
      clearInterval(msgInterval)
      setProgress(100)
      setRelatorioGerado(texto)
      setGeradoEm(Math.round((Date.now() - t0) / 1000))

      const novo: RelatorioGerado = {
        id: Date.now().toString(),
        patient_name: pacienteSelecionado.nome,
        patient_id: pacienteSelecionado.id,
        tipo,
        conteudo: texto,
        data_geracao: hoje(),
        periodo_inicio: periodoInicio || hoje(),
        periodo_fim: periodoFim || hoje(),
      }
      saveRelatorios([novo, ...relatorios])

      setEmailPara(pacienteSelecionado.email ?? '')
      setEmailAssunto(`Relatório de ${tipoLabel[tipo]} — ${pacienteSelecionado.nome} — ${hoje()}`)
      setEmailMensagem(
        `Prezado(a) responsável,\n\nSegue em anexo o relatório de ${tipoLabel[tipo]} do(a) paciente ${pacienteSelecionado.nome}, referente ao período ${periodoInicio || hoje()} a ${periodoFim || hoje()}.\n\nEm caso de dúvidas, estou à disposição.\n\nAtenciosamente,\n${nomeTerapeuta}\nTerapeuta Ocupacional — CRF/TO ${crfTo}`
      )
    } catch (err) {
      clearInterval(progInterval)
      clearInterval(msgInterval)
      setToast({ message: err instanceof Error ? err.message : 'Erro ao gerar relatório', type: 'error' })
      setStep(1)
    } finally {
      setGenerating(false)
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleEnviarEmail() {
    setEmailModal(false)
    setToast({ message: `E-mail enviado com sucesso para ${emailPara}`, type: 'success' })
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────

  if (!criando) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-ink">Relatórios</h2>
          <Button onClick={() => { setCriando(true); setStep(0) }}>
            <Plus size={16} className="mr-1" /> Novo relatório
          </Button>
        </div>

        {relatorios.length === 0 ? (
          <Card className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
              <FileText size={36} className="text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-ink text-lg">Nenhum relatório gerado ainda</p>
              <p className="text-ink-4 text-sm mt-1">Crie seu primeiro relatório em menos de 2 minutos</p>
            </div>
            <Button onClick={() => { setCriando(true); setStep(0) }}>Criar primeiro relatório</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {relatorios.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink">{r.patient_name}</span>
                      <Badge variant={tipoBadge[r.tipo]}>{tipoLabel[r.tipo]}</Badge>
                      <span className="text-xs text-ink-4 ml-auto">{r.data_geracao}</span>
                    </div>
                    <p className="text-sm text-ink-4 mt-1 line-clamp-2">{r.conteudo}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button variant="outline" className="text-xs h-8 px-3" onClick={() => setViewerRelatorio(r)}>
                        <Eye size={13} className="mr-1" /> Visualizar
                      </Button>
                      <Button
                        className="text-xs h-8 px-3"
                        onClick={() => {
                          setViewerRelatorio(r)
                          setTimeout(() => gerarPDF('relatorio-preview', `relatorio-${r.patient_name.replace(/ /g, '-')}-${slugData()}`), 600)
                        }}
                      >
                        <Download size={13} className="mr-1" /> Download PDF
                      </Button>
                      <Button variant="ghost" className="text-xs h-8 px-3" onClick={() => {
                        setEmailPara('')
                        setEmailAssunto(`Relatório de ${tipoLabel[r.tipo]} — ${r.patient_name} — ${r.data_geracao}`)
                        setEmailMensagem(`Segue o relatório de ${tipoLabel[r.tipo]} do(a) paciente ${r.patient_name}.\n\nAtenciosamente,\n${nomeTerapeuta}`)
                        setEmailModal(true)
                      }}>
                        <Mail size={13} className="mr-1" /> Enviar por e-mail
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Viewer modal */}
        {viewerRelatorio && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewerRelatorio(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div id="relatorio-preview" className="p-10">
                <RelatorioPrint
                  conteudo={viewerRelatorio.conteudo}
                  nomePaciente={viewerRelatorio.patient_name}
                  tipo={tipoLabel[viewerRelatorio.tipo]}
                  data={viewerRelatorio.data_geracao}
                  nomeTerapeuta={nomeTerapeuta}
                  crfTo={crfTo}
                  logoUrl={logoUrl}
                />
              </div>
              <div className="flex justify-end gap-2 p-4 border-t">
                <Button variant="outline" onClick={() => setViewerRelatorio(null)}>Fechar</Button>
                <Button onClick={() => gerarPDF('relatorio-preview', `relatorio-${viewerRelatorio.patient_name.replace(/ /g, '-')}-${slugData()}`)}>
                  <Download size={14} className="mr-1" /> Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}

        {emailModal && (
          <EmailModal
            emailPara={emailPara} setEmailPara={setEmailPara}
            emailCC={emailCC} setEmailCC={setEmailCC}
            emailAssunto={emailAssunto} setEmailAssunto={setEmailAssunto}
            emailMensagem={emailMensagem} setEmailMensagem={setEmailMensagem}
            onClose={() => setEmailModal(false)}
            onSend={handleEnviarEmail}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  // ── WIZARD ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-2xl font-semibold text-ink">Novo Relatório</h2>
        <button onClick={resetWizard} className="flex items-center gap-1 text-sm text-ink-4 hover:text-red-500 transition-colors">
          <X size={16} /> Cancelar
        </button>
      </div>

      <ProgressBar step={step} />

      {/* ── PASSO 0: Informações ─────────────────────────────────────────── */}
      {step === 0 && (
        <Card className="p-6 space-y-5">
          <h3 className="font-semibold text-ink text-lg">Informações do paciente</h3>

          <div>
            <label className="text-sm font-medium text-ink-2 block mb-1">Paciente</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
              placeholder="Buscar paciente..."
              value={buscaPaciente}
              onChange={(e) => { setBuscaPaciente(e.target.value); setPacienteSelecionado(null) }}
            />
            {buscaPaciente && !pacienteSelecionado && (
              <div className="border border-gray-200 rounded-xl mt-1 overflow-hidden shadow-sm">
                {pacientesMock
                  .filter((p) => p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()))
                  .map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0"
                      onClick={() => { setPacienteSelecionado(p); setBuscaPaciente(p.nome) }}
                    >
                      {p.nome}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-ink-2 block mb-2">Tipo de relatório</label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { key: 'evolucao' as TipoRelatorio, label: 'Evolução', desc: 'Progresso da sessão', Icon: TrendingUp },
                  { key: 'avaliacao' as TipoRelatorio, label: 'Avaliação', desc: 'Avaliação inicial ou reavaliação', Icon: ClipboardList },
                  { key: 'alta' as TipoRelatorio, label: 'Alta', desc: 'Encerramento do acompanhamento', Icon: GraduationCap },
                  { key: 'encaminhamento' as TipoRelatorio, label: 'Encaminhamento', desc: 'Para outro profissional', Icon: Send },
                ]
              ).map(({ key, label, desc, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTipo(key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${tipo === key ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                >
                  <Icon size={20} className={tipo === key ? 'text-green-500' : 'text-ink-4'} />
                  <p className="font-medium text-ink text-sm mt-2">{label}</p>
                  <p className="text-xs text-ink-4">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Data inicial" type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
            <Input label="Data final" type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          </div>

          <Button className="w-full" disabled={!pacienteSelecionado || !tipo} onClick={() => setStep(1)}>
            Próximo →
          </Button>
        </Card>
      )}

      {/* ── PASSO 1: Briefing ─────────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-ink text-lg">Descreva a sessão ou o histórico do paciente</h3>
            <p className="text-sm text-ink-4 mt-1">Quanto mais detalhes você fornecer, melhor será o relatório gerado.</p>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {(['texto', 'audio'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTabEntrada(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tabEntrada === t ? 'bg-white shadow text-ink' : 'text-ink-4'}`}
              >
                {t === 'texto' ? '✍️ Texto' : '🎤 Áudio'}
              </button>
            ))}
          </div>

          {tabEntrada === 'texto' ? (
            <div className="relative">
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none min-h-[200px]"
                placeholder="Descreva livremente: o que foi trabalhado na sessão, comportamentos observados, evolução do paciente, objetivos atingidos, dificuldades encontradas, condutas adotadas e planos para as próximas sessões..."
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
              />
              <span className="absolute bottom-3 right-3 text-xs text-ink-5">{briefing.length} caracteres</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  'Paciente apresentou melhora em...',
                  'Foram trabalhadas habilidades de...',
                  'Observou-se dificuldade em...',
                  'Objetivos da sessão:',
                  'Conduta adotada:',
                  'Próximos passos:',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setBriefing((b) => b + (b ? '\n' : '') + chip)}
                    className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              {audioState === 'idle' && (
                <>
                  <button
                    onClick={startRecording}
                    className="w-24 h-24 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Mic size={36} className="text-gray-500" />
                  </button>
                  <p className="text-sm text-ink-4">Clique para iniciar gravação</p>
                </>
              )}
              {audioState === 'recording' && (
                <>
                  <button
                    onClick={stopRecording}
                    className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center animate-pulse"
                  >
                    <MicOff size={36} className="text-white" />
                  </button>
                  <p className="text-2xl font-mono font-bold text-red-500">{formatTimer(audioTimer)}</p>
                  <p className="text-sm text-ink-4">Gravando... clique para parar</p>
                </>
              )}
              {audioState === 'done' && (
                <div className="w-full space-y-2">
                  <textarea
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none min-h-[160px]"
                    value={briefing}
                    onChange={(e) => setBriefing(e.target.value)}
                  />
                  <button
                    onClick={() => { setBriefing(''); setAudioState('idle'); setAudioTimer(0) }}
                    className="text-sm text-green-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={13} /> Regravar
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
            💡 <strong>Dica:</strong> Quanto mais detalhes você incluir sobre a sessão, mais completo e personalizado será o relatório gerado.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}><ChevronLeft size={14} className="mr-1" /> Voltar</Button>
            <Button className="flex-1" disabled={!briefing.trim()} onClick={handleGerar}>
              <Sparkles size={15} className="mr-1" /> Gerar Relatório com IA
            </Button>
          </div>
        </Card>
      )}

      {/* ── PASSO 2: Resultado ────────────────────────────────────────────── */}
      {step === 2 && (
        generating ? (
          <Card className="p-10 flex flex-col items-center gap-6">
            <Loader2 size={52} className="text-green-500 animate-spin" />
            <p className="text-ink font-medium text-lg text-center">{loadingMessages[loadingMsgIdx]}</p>
            <div className="w-full max-w-sm bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-ink-4">{Math.round(progress)}%</p>
          </Card>
        ) : (
          <div className="flex gap-4 flex-col lg:flex-row">
            {/* Controls */}
            <div className="lg:w-2/5 space-y-4">
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                  <CheckCircle2 size={16} /> Relatório gerado com sucesso
                </div>
                <div className="space-y-1 text-sm text-ink-2">
                  <p><span className="font-medium">Paciente:</span> {pacienteSelecionado?.nome}</p>
                  <p><span className="font-medium">Tipo:</span> {tipo ? tipoLabel[tipo] : ''}</p>
                  <p><span className="font-medium">Data:</span> {hoje()}</p>
                  <p><span className="font-medium">Gerado em:</span> {geradoEm}s</p>
                </div>

                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-green-400 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-16 mx-auto object-contain" />
                  ) : (
                    <>
                      <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-ink-4">Upload de logo</p>
                    </>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
                <p className="text-xs text-ink-5 -mt-2 text-center">Sua logo aparecerá no cabeçalho do PDF</p>

                <Input label="Nome do terapeuta" value={nomeTerapeuta} onChange={(e) => setNomeTerapeuta(e.target.value)} />
                <Input label="CRF/TO" value={crfTo} onChange={(e) => setCrfTo(e.target.value)} />

                <div className="space-y-2 pt-1">
                  <Button
                    className="w-full"
                    onClick={() => gerarPDF('relatorio-preview', `relatorio-${pacienteSelecionado?.nome.replace(/ /g, '-')}-${slugData()}`)}
                  >
                    <Download size={14} className="mr-1" /> Download PDF
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setEmailModal(true)}>
                    <Mail size={14} className="mr-1" /> Enviar por e-mail
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
                    <Pencil size={14} className="mr-1" /> Editar briefing
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => { setRelatorioGerado(''); handleGerar() }}>
                    <RefreshCw size={14} className="mr-1" /> Gerar novamente
                  </Button>
                </div>
              </Card>
            </div>

            {/* Document preview */}
            <div className="lg:w-3/5">
              <div id="relatorio-preview" className="bg-white border border-gray-200 shadow-sm rounded-2xl p-10">
                <RelatorioPrint
                  conteudo={relatorioGerado}
                  nomePaciente={pacienteSelecionado?.nome ?? ''}
                  tipo={tipo ? tipoLabel[tipo] : ''}
                  data={hoje()}
                  nomeTerapeuta={nomeTerapeuta}
                  crfTo={crfTo}
                  logoUrl={logoUrl}
                />
              </div>
            </div>
          </div>
        )
      )}

      {emailModal && (
        <EmailModal
          emailPara={emailPara} setEmailPara={setEmailPara}
          emailCC={emailCC} setEmailCC={setEmailCC}
          emailAssunto={emailAssunto} setEmailAssunto={setEmailAssunto}
          emailMensagem={emailMensagem} setEmailMensagem={setEmailMensagem}
          onClose={() => setEmailModal(false)}
          onSend={handleEnviarEmail}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
