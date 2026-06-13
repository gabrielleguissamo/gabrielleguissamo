import ReactMarkdown from 'react-markdown'
import { formatarData } from '../../lib/formatDate'
import type { BrandColors } from '../../lib/brandColors'
import { defaultBrandColors } from '../../lib/brandColors'

interface RelatorioPreviewProps {
  conteudo: string
  editando: boolean
  onChange?: (novoConteudo: string) => void
  nomePaciente: string
  nomeTerapeuta: string
  crfto: string
  cidPrincipal: string
  financiamento: string
  tuss?: string
  periodoInicio: string
  periodoFim: string
  logoUrl?: string
  brandColors?: BrandColors
  id?: string
}

export function RelatorioPreview({
  conteudo,
  editando,
  onChange,
  nomePaciente,
  nomeTerapeuta,
  crfto,
  cidPrincipal,
  financiamento,
  tuss,
  periodoInicio,
  periodoFim,
  logoUrl,
  brandColors = defaultBrandColors,
  id = 'relatorio-preview',
}: RelatorioPreviewProps) {
  const hoje = formatarData(new Date())

  return (
    <div
      id={id}
      style={{ fontFamily: "'Montserrat', sans-serif" }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Cabeçalho */}
      <div
        className="px-10 pt-8 pb-6 border-b border-gray-200"
        style={{ background: `linear-gradient(135deg, ${brandColors.primary}08, ${brandColors.light})` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-14 w-auto object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center"
                style={{ background: brandColors.light, border: `1px solid ${brandColors.primary}30` }}
              >
                <span
                  className="font-bold text-lg"
                  style={{ fontFamily: 'Fraunces, serif', color: brandColors.primary }}
                >
                  T
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-800 text-sm">{nomeTerapeuta}</p>
            <p className="text-gray-500 text-xs">Terapeuta Ocupacional</p>
            <p className="text-gray-500 text-xs">CRF/TO: {crfto}</p>
          </div>
        </div>

        <div className="mt-5 mb-4 h-0.5" style={{ background: brandColors.primary }} />

        <h1
          className="text-center text-lg font-bold uppercase tracking-wide mb-4"
          style={{ fontFamily: 'Fraunces, serif', color: brandColors.primary }}
        >
          Relatório Clínico de Terapia Ocupacional
        </h1>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
          <div>
            <span className="text-gray-400 font-medium">Paciente</span>
            <p className="text-gray-700 font-semibold">{nomePaciente}</p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Período de referência</span>
            <p className="text-gray-700 font-semibold">
              {periodoInicio ? formatarData(periodoInicio) : hoje} a {periodoFim ? formatarData(periodoFim) : hoje}
            </p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Diagnóstico (CID-10)</span>
            <p className="text-gray-700 font-semibold">{cidPrincipal}</p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Financiamento</span>
            <p className="text-gray-700 font-semibold">
              {financiamento === 'convenio' ? `Convênio${tuss ? ` — TUSS: ${tuss}` : ''}` : 'Particular'}
            </p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Data de emissão</span>
            <p className="text-gray-700 font-semibold">{hoje}</p>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="px-10 py-8">
        {!editando && (
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h2
                  className="text-xs font-bold uppercase tracking-widest mt-7 mb-2 pb-1"
                  style={{ color: brandColors.primary, borderBottom: `1px solid ${brandColors.light}` }}
                >
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h2
                  className="text-xs font-bold uppercase tracking-widest mt-7 mb-2 pb-1"
                  style={{ color: brandColors.primary, borderBottom: `1px solid ${brandColors.light}` }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-1">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-800">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="list-none space-y-1 mb-3">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="text-sm text-gray-700 leading-relaxed flex gap-2">
                  <span className="mt-1 flex-shrink-0" style={{ color: brandColors.primary }}>▸</span>
                  <span>{children}</span>
                </li>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 mb-3 ml-2">{children}</ol>
              ),
              hr: () => <div className="my-4 h-px bg-gray-100" />,
              code: ({ children }) => <span className="text-gray-700">{children}</span>,
            }}
          >
            {conteudo}
          </ReactMarkdown>
        )}

        {editando && (
          <div className="relative">
            <div className="absolute -top-2 -right-2 z-10">
              <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded-full border border-yellow-200">
                ✏️ Modo edição
              </span>
            </div>
            <textarea
              value={conteudo}
              onChange={(e) => onChange?.(e.target.value)}
              className="w-full min-h-[600px] text-sm text-gray-700 leading-relaxed font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 resize-y focus:outline-none focus:ring-1 focus:ring-green-200"
              style={{ borderColor: editando ? brandColors.primary + '40' : undefined }}
              placeholder="Conteúdo do relatório..."
              spellCheck
              lang="pt-BR"
            />
            <p className="text-xs text-gray-400 mt-2">
              Use Markdown: **negrito**, ## Título, - lista. As formatações aparecem ao sair do modo de edição.
            </p>
          </div>
        )}
      </div>

      {/* Assinatura */}
      <div className="px-10 pb-8">
        <div className="pt-8 mt-4 border-t-2" style={{ borderColor: brandColors.primary }}>
          <div className="flex items-end justify-between">
            <div>
              <div className="w-56 border-b border-gray-400 mb-2" />
              <p className="text-sm font-semibold text-gray-700">{nomeTerapeuta}</p>
              <p className="text-xs text-gray-500">Terapeuta Ocupacional</p>
              <p className="text-xs text-gray-500">CRF/TO: {crfto}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Data: _____ / _____ / _________</p>
              <p className="text-xs text-gray-400 mt-1">Local: _______________________</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-300">Documento emitido pelo Terapô.pro</p>
          </div>
        </div>
      </div>
    </div>
  )
}
