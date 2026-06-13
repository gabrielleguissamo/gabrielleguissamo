import { useState, useRef } from 'react'
import { Mic, MicOff, RefreshCw, Sparkles } from 'lucide-react'

interface Props {
  briefing: string
  onChange: (v: string) => void
  onVoltar: () => void
  onGerar: () => void
}

export function WizardStep2({ briefing, onChange, onVoltar, onGerar }: Props) {
  const [tab, setTab] = useState<'texto' | 'audio'>('texto')
  const [audioState, setAudioState] = useState<'idle' | 'recording' | 'done'>('idle')
  const [timer, setTimer] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  function startRec() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true
    let final = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      onChange(final + interim)
    }
    rec.onend = () => { setAudioState('done'); if (timerRef.current) clearInterval(timerRef.current) }
    recRef.current = rec; rec.start()
    setAudioState('recording'); setTimer(0)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }

  function stopRec() {
    recRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const CHIPS = [
    'Paciente apresentou melhora em...',
    'Foram trabalhadas habilidades de...',
    'Observou-se dificuldade em...',
    'Objetivos da sessão:',
    'Conduta adotada:',
    'Próximos passos:',
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Fraunces, serif' }}>
          Descreva a sessão
        </h2>
        <p className="text-sm text-gray-500 mt-1">Quanto mais detalhes, melhor será o relatório.</p>
      </div>

      {/* Tab */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['texto', 'audio'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>
            {t === 'texto' ? '✍️ Texto' : '🎤 Áudio'}
          </button>
        ))}
      </div>

      {tab === 'texto' ? (
        <div className="relative">
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none min-h-[220px]"
            placeholder="Descreva o que foi trabalhado, comportamentos observados, evolução, objetivos atingidos, dificuldades e próximos passos..."
            value={briefing}
            onChange={e => onChange(e.target.value)}
          />
          <span className="absolute bottom-3 right-3 text-xs text-gray-300">{briefing.length} caracteres</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {CHIPS.map(chip => (
              <button key={chip} onClick={() => onChange(briefing + (briefing ? '\n' : '') + chip)}
                className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors">
                {chip}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-6">
          {audioState === 'idle' && (
            <>
              <button onClick={startRec} className="w-24 h-24 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <Mic size={36} className="text-gray-500" />
              </button>
              <p className="text-sm text-gray-400">Clique para iniciar gravação</p>
            </>
          )}
          {audioState === 'recording' && (
            <>
              <button onClick={stopRec} className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center animate-pulse">
                <MicOff size={36} className="text-white" />
              </button>
              <p className="text-2xl font-mono font-bold text-red-500">{fmt(timer)}</p>
              <p className="text-sm text-gray-400">Gravando... clique para parar</p>
            </>
          )}
          {audioState === 'done' && (
            <div className="w-full space-y-2">
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none min-h-[160px]"
                value={briefing}
                onChange={e => onChange(e.target.value)}
              />
              <button onClick={() => { onChange(''); setAudioState('idle'); setTimer(0) }}
                className="text-sm text-green-600 hover:underline flex items-center gap-1">
                <RefreshCw size={13} /> Regravar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
        💡 <strong>Dica:</strong> Inclua objetivos da sessão, condutas adotadas e observações clínicas para um relatório mais completo.
      </div>

      <div className="flex gap-3">
        <button onClick={onVoltar} className="px-6 py-3 border border-gray-200 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Voltar
        </button>
        <button
          onClick={onGerar}
          disabled={!briefing.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-full font-bold text-sm hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Sparkles size={16} /> Gerar Relatório com IA
        </button>
      </div>
    </div>
  )
}
