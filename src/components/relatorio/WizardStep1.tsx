import { useState } from 'react'
import { TrendingUp, ClipboardList, GraduationCap, Send, Building2, User } from 'lucide-react'

// ── CIDs ─────────────────────────────────────────────────────────────────────
const CIDS = [
  { codigo: 'F84.0', descricao: 'Autismo infantil' },
  { codigo: 'F84.1', descricao: 'Autismo atípico' },
  { codigo: 'F84.5', descricao: 'Síndrome de Asperger' },
  { codigo: 'F90.0', descricao: 'TDAH — Distúrbio de atividade e atenção' },
  { codigo: 'F90.1', descricao: 'Transtorno hipercinético de conduta' },
  { codigo: 'F80.1', descricao: 'Transtorno expressivo de linguagem' },
  { codigo: 'F80.2', descricao: 'Transtorno receptivo de linguagem' },
  { codigo: 'F82',   descricao: 'Transtorno específico do desenvolvimento motor' },
  { codigo: 'F83',   descricao: 'Transtornos mistos do desenvolvimento' },
  { codigo: 'F70',   descricao: 'Retardo mental leve' },
  { codigo: 'F71',   descricao: 'Retardo mental moderado' },
  { codigo: 'F72',   descricao: 'Retardo mental grave' },
  { codigo: 'G80.0', descricao: 'Paralisia cerebral espástica tetraplegia' },
  { codigo: 'G80.1', descricao: 'Paralisia cerebral espástica diplegia' },
  { codigo: 'G80.2', descricao: 'Paralisia cerebral espástica hemiplegia' },
  { codigo: 'G81',   descricao: 'Hemiplegia' },
  { codigo: 'G82',   descricao: 'Paraplegia e tetraplegia' },
  { codigo: 'Q05',   descricao: 'Espinha bífida' },
  { codigo: 'Q90',   descricao: 'Síndrome de Down' },
  { codigo: 'G35',   descricao: 'Esclerose múltipla' },
  { codigo: 'G20',   descricao: 'Doença de Parkinson' },
  { codigo: 'G30',   descricao: 'Doença de Alzheimer' },
  { codigo: 'I63',   descricao: 'AVC isquêmico' },
  { codigo: 'I61',   descricao: 'AVC hemorrágico' },
  { codigo: 'M79.7', descricao: 'Fibromialgia' },
  { codigo: 'M54.5', descricao: 'Dor lombar baixa' },
  { codigo: 'G56.0', descricao: 'Síndrome do túnel do carpo' },
  { codigo: 'F32',   descricao: 'Episódios depressivos' },
  { codigo: 'F41.1', descricao: 'Transtorno de ansiedade generalizada' },
  { codigo: 'F20',   descricao: 'Esquizofrenia' },
  { codigo: 'F31',   descricao: 'Transtorno afetivo bipolar' },
  { codigo: 'Z73.0', descricao: 'Burnout' },
]

const TUSS = [
  { codigo: '50000470', descricao: 'Terapia ocupacional — sessão individual' },
  { codigo: '50000489', descricao: 'Terapia ocupacional em grupo' },
  { codigo: '50000497', descricao: 'Avaliação em terapia ocupacional' },
  { codigo: '50000500', descricao: 'Treino de AVDs' },
  { codigo: '50000519', descricao: 'Treino de AIVDs' },
  { codigo: '50000535', descricao: 'Estimulação sensório-motora' },
  { codigo: '50000543', descricao: 'Integração sensorial' },
  { codigo: '50000551', descricao: 'Reabilitação cognitiva' },
  { codigo: '50000560', descricao: 'Treino de habilidades sociais' },
]

// ── Sub-componentes de autocomplete ──────────────────────────────────────────

function CidInput({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean
}) {
  const [q, setQ] = useState(value)
  const [open, setOpen] = useState(false)
  const matches = q.length >= 2
    ? CIDS.filter(c => c.codigo.toLowerCase().includes(q.toLowerCase()) || c.descricao.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : []
  const display = value ? value : ''
  return (
    <div className="relative">
      <label className="text-sm font-medium text-gray-700 block mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
        placeholder="Digite código ou nome (ex: F84 ou Autismo)"
        value={q}
        onChange={e => { setQ(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {display && <p className="text-xs text-green-600 mt-1 font-medium">{display}</p>}
      {open && matches.length > 0 && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
          {matches.map(c => (
            <button
              key={c.codigo}
              className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0"
              onMouseDown={() => { const v = `${c.codigo} — ${c.descricao}`; setQ(v); onChange(v); setOpen(false) }}
            >
              <span className="font-mono text-green-600">{c.codigo}</span>
              <span className="text-gray-500 ml-2">{c.descricao}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TussInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(value)
  const [open, setOpen] = useState(false)
  const matches = q.length >= 2 ? TUSS.filter(t => t.codigo.includes(q) || t.descricao.toLowerCase().includes(q.toLowerCase())) : []
  return (
    <div className="relative">
      <label className="text-sm font-medium text-gray-700 block mb-1">Código TUSS <span className="text-red-500">*</span></label>
      <input
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
        placeholder="Digite código ou procedimento"
        value={q}
        onChange={e => { setQ(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {value && <p className="text-xs text-green-600 mt-1 font-medium">{value}</p>}
      {open && matches.length > 0 && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
          {matches.map(t => (
            <button
              key={t.codigo}
              className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0"
              onMouseDown={() => { const v = `${t.codigo} — ${t.descricao}`; setQ(v); onChange(v); setOpen(false) }}
            >
              <span className="font-mono text-green-600">{t.codigo}</span>
              <span className="text-gray-500 ml-2">{t.descricao}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Dados {
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

interface Props {
  dados: Dados
  onChange: (d: Dados) => void
  onProximo: () => void
  patients: { id: string; name: string; email?: string }[]
  isClinical?: boolean
}

export function WizardStep1({ dados, onChange, onProximo, patients, isClinical = true }: Props) {
  const [buscaPaciente, setBuscaPaciente] = useState(dados.paciente?.name || '')
  const isHolistico = !isClinical

  const d = dados
  const valido = isHolistico
    ? d.paciente && d.tipo
    : d.paciente && d.tipo && d.financiamento && d.cidPrincipal &&
      (d.financiamento === 'particular' || d.tuss)

  const set = (patch: Partial<Dados>) => onChange({ ...d, ...patch })

  const TIPOS = [
    { key: 'evolucao' as const, label: 'Evolução', desc: 'Progresso da sessão', Icon: TrendingUp },
    { key: 'avaliacao' as const, label: 'Avaliação', desc: 'Avaliação inicial', Icon: ClipboardList },
    { key: 'alta' as const, label: 'Alta', desc: 'Encerramento', Icon: GraduationCap },
    { key: 'encaminhamento' as const, label: 'Encaminhamento', desc: 'Para outro profissional', Icon: Send },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
      <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Fraunces, serif' }}>
        Informações do relatório
      </h2>

      {/* Paciente */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Paciente <span className="text-red-500">*</span></label>
        <input
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
          placeholder="Buscar paciente..."
          value={buscaPaciente}
          onChange={e => { setBuscaPaciente(e.target.value); set({ paciente: undefined }) }}
        />
        {buscaPaciente && !d.paciente && (
          <div className="border border-gray-200 rounded-xl mt-1 overflow-hidden shadow-sm">
            {patients.filter(p => p.name.toLowerCase().includes(buscaPaciente.toLowerCase())).length === 0 ? (
              <p className="px-4 py-2.5 text-sm text-gray-400">Nenhum paciente encontrado</p>
            ) : (
              patients.filter(p => p.name.toLowerCase().includes(buscaPaciente.toLowerCase())).map(p => (
                <button key={p.id} className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 border-b border-gray-50 last:border-0"
                  onClick={() => { set({ paciente: { id: p.id, name: p.name, email: p.email || '' } }); setBuscaPaciente(p.name) }}>
                  {p.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Tipo */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Tipo de relatório <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          {TIPOS.map(({ key, label, desc, Icon }) => (
            <button key={key} onClick={() => set({ tipo: key })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${d.tipo === key ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
              <Icon size={20} className={d.tipo === key ? 'text-green-500' : 'text-gray-400'} />
              <p className="font-semibold text-gray-800 text-sm mt-2">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Financiamento */}
      {!isHolistico && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Financiamento <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => set({ financiamento: 'convenio' })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${d.financiamento === 'convenio' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
              <Building2 size={20} className={d.financiamento === 'convenio' ? 'text-green-500' : 'text-gray-400'} />
              <p className="font-semibold text-gray-800 text-sm mt-2">Convênio</p>
              <p className="text-xs text-gray-400">Plano de saúde / TISS</p>
            </button>
            <button onClick={() => set({ financiamento: 'particular' })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${d.financiamento === 'particular' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
              <User size={20} className={d.financiamento === 'particular' ? 'text-green-500' : 'text-gray-400'} />
              <p className="font-semibold text-gray-800 text-sm mt-2">Particular</p>
              <p className="text-xs text-gray-400">Atendimento privado</p>
            </button>
          </div>
        </div>
      )}

      {/* CID Principal */}
      {!isHolistico && (
        <>
          <CidInput label="CID-10 Principal" value={d.cidPrincipal || ''} onChange={v => set({ cidPrincipal: v })} required />
          <CidInput label="CID-10 Secundário (opcional)" value={d.cidSecundario || ''} onChange={v => set({ cidSecundario: v })} />

          {/* CIF */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">CIF (opcional)</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
              placeholder="ex: b1 Funções mentais, d4 Mobilidade"
              value={d.cif || ''}
              onChange={e => set({ cif: e.target.value })}
            />
          </div>

          {/* TUSS */}
          {d.financiamento === 'convenio' && (
            <TussInput value={d.tuss || ''} onChange={v => set({ tuss: v })} />
          )}
        </>
      )}

      {/* Período */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Data inicial</label>
          <input type="date" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
            value={d.periodoInicio || ''} onChange={e => set({ periodoInicio: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Data final</label>
          <input type="date" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
            value={d.periodoFim || ''} onChange={e => set({ periodoFim: e.target.value })} />
        </div>
      </div>

      <button
        onClick={onProximo}
        disabled={!valido}
        className="w-full py-3.5 bg-green-500 text-white rounded-full font-bold text-sm hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Próximo →
      </button>
    </div>
  )
}
