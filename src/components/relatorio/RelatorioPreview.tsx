import React from 'react'
import ReactMarkdown from 'react-markdown'
import type { BrandColors } from '../../lib/brandColors'
import { defaultBrandColors } from '../../lib/brandColors'
import { formatarData } from '../../lib/formatDate'

interface Props {
  id?: string
  conteudo: string
  editando: boolean
  onChange?: (v: string) => void
  nomePaciente: string
  nomeTerapeuta: string
  crfto: string
  cidPrincipal: string
  financiamento: string
  tuss?: string
  periodoInicio: string
  periodoFim: string
  logoUrl?: string
  logoRef?: React.RefObject<HTMLImageElement>
  brandColors?: BrandColors
  tipoRelatorio?: string
}

const TIPO_SUBTITULO: Record<string, string> = {
  evolucao: 'Relatório de Evolução',
  avaliacao: 'Relatório de Avaliação',
  alta: 'Relatório de Alta',
  encaminhamento: 'Relatório de Encaminhamento',
}

export function RelatorioPreview({
  id = 'relatorio-preview',
  conteudo, editando, onChange,
  nomePaciente, nomeTerapeuta, crfto,
  cidPrincipal, financiamento, tuss,
  periodoInicio, periodoFim,
  logoUrl, logoRef,
  brandColors = defaultBrandColors,
  tipoRelatorio,
}: Props) {
  const hoje = formatarData(new Date())
  const inicio = periodoInicio ? formatarData(periodoInicio) : hoje
  const fim = periodoFim ? formatarData(periodoFim) : hoje

  const meta = [
    ['Paciente', nomePaciente],
    ['Período', `${inicio} a ${fim}`],
    ['Diagnóstico (CID-10)', cidPrincipal],
    ['Financiamento', financiamento === 'convenio' ? `Convênio${tuss ? ` — TUSS: ${tuss}` : ''}` : 'Particular'],
    ['Data de emissão', hoje],
  ]

  return (
    <div
      id={id}
      style={{ fontFamily: "'Montserrat', sans-serif" }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Cabeçalho */}
      <div
        className="px-10 pt-8 pb-6 border-b border-gray-100"
        style={{ background: `linear-gradient(135deg, ${brandColors.primary}0d, ${brandColors.light})` }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-shrink-0 min-w-[56px]">
            {logoUrl ? (
              <img
                ref={logoRef}
                src={logoUrl}
                alt="Logo"
                crossOrigin="anonymous"
                className="h-14 w-auto max-w-[160px] object-contain block"
              />
            ) : (
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center font-bold text-lg"
                style={{ background: brandColors.light, color: brandColors.primary, fontFamily: 'Fraunces, serif' }}
              >T</div>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-sm" style={{ color: brandColors.primary }}>{nomeTerapeuta || 'Nome do Terapeuta'}</p>
            <p className="text-gray-500 text-xs mt-0.5">Terapeuta Ocupacional</p>
            {crfto && <p className="text-gray-500 text-xs">CRF/TO: {crfto}</p>}
          </div>
        </div>

        <div className="h-0.5 mb-5 rounded" style={{ background: brandColors.primary }} />

        <h1
          className="text-center text-base font-bold uppercase tracking-wide mb-1"
          style={{ color: brandColors.primary, fontFamily: 'Fraunces, serif' }}
        >
          Relatório Clínico de Terapia Ocupacional
        </h1>
        {tipoRelatorio && (
          <p className="text-center text-xs font-medium text-gray-500 mb-5">
            {TIPO_SUBTITULO[tipoRelatorio] || ''}
          </p>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs mt-4">
          {meta.map(([label, value]) => (
            <div key={label}>
              <span className="text-gray-400 font-medium block">{label}</span>
              <span className="font-semibold text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Corpo */}
      <div className="px-10 py-8">
        {!editando ? (
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h2 className="text-xs font-bold uppercase tracking-widest mt-7 mb-2 pb-1.5"
                    style={{ color: brandColors.primary, borderBottom: `1.5px solid ${brandColors.light}` }}>
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h2 className="text-xs font-bold uppercase tracking-widest mt-7 mb-2 pb-1.5"
                    style={{ color: brandColors.primary, borderBottom: `1.5px solid ${brandColors.light}` }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xs font-semibold text-gray-600 mt-4 mb-1 uppercase tracking-wide">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-800">{children}</strong>
              ),
              ul: ({ children }) => <ul className="space-y-1 mb-3">{children}</ul>,
              li: ({ children }) => (
                <li className="text-sm text-gray-700 flex gap-2 leading-relaxed">
                  <span className="mt-1 flex-shrink-0" style={{ color: brandColors.primary }}>▸</span>
                  <span>{children}</span>
                </li>
              ),
              ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 mb-3">{children}</ol>,
              hr: () => <div className="my-4 h-px bg-gray-100" />,
              code: ({ children }) => <span className="text-gray-700">{children}</span>,
            }}
          >
            {conteudo}
          </ReactMarkdown>
        ) : (
          <div className="relative">
            <span className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full border border-yellow-200">
              ✏️ Modo edição
            </span>
            <textarea
              value={conteudo}
              onChange={e => onChange?.(e.target.value)}
              spellCheck lang="pt-BR"
              className="w-full min-h-[600px] text-sm text-gray-700 leading-relaxed font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 resize-y focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100"
            />
            <p className="text-xs text-gray-400 mt-2">Use Markdown: **negrito**, ## Título, - lista</p>
          </div>
        )}
      </div>

      {/* Assinatura */}
      <div className="px-10 pb-10">
        <div className="pt-8 mt-2" style={{ borderTop: `2px solid ${brandColors.primary}` }}>
          <div className="flex items-end justify-between">
            <div>
              <div className="w-56 border-b border-gray-400 mb-2" />
              <p className="text-sm font-semibold text-gray-800">{nomeTerapeuta}</p>
              <p className="text-xs text-gray-500">Terapeuta Ocupacional</p>
              {crfto && <p className="text-xs text-gray-500">CRF/TO: {crfto}</p>}
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Data: _____ / _____ / _______</p>
              <p className="mt-2">Local: _________________________</p>
            </div>
          </div>
          <p className="text-center text-xs mt-6 pt-4 border-t border-gray-100" style={{ color: brandColors.primary, opacity: 0.4 }}>
            Documento emitido pelo Terapô.pro
          </p>
        </div>
      </div>
    </div>
  )
}
