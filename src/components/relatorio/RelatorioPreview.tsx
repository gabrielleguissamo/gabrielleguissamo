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
  cidade?: string
  estado?: string
}

const TIPO_LABEL: Record<string, string> = {
  evolucao: 'Relatório de Evolução',
  avaliacao: 'Relatório de Avaliação Funcional',
  alta: 'Relatório de Alta Terapêutica',
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
  cidade, estado,
}: Props) {
  const hoje = formatarData(new Date())
  const inicio = periodoInicio ? formatarData(periodoInicio) : hoje
  const fim = periodoFim ? formatarData(periodoFim) : hoje
  const localStr = [cidade, estado].filter(Boolean).join(' / ')
  const tipoLabel = tipoRelatorio ? (TIPO_LABEL[tipoRelatorio] || tipoRelatorio) : 'Relatório Clínico'

  const col = brandColors.primary

  return (
    <div
      id={id}
      style={{ fontFamily: 'Montserrat, sans-serif', background: '#ffffff', width: '794px' }}
    >
      {/* ── CABEÇALHO ── */}
      <div style={{ background: col, padding: '28px 40px 24px' }}>

        {/* Linha 1: foto + nome + tipo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>

          {/* Foto circular */}
          <div style={{ flexShrink: 0 }}>
            {logoUrl ? (
              <img
                ref={logoRef}
                src={logoUrl}
                alt="Foto"
                crossOrigin="anonymous"
                style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '68px', height: '68px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: '3px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                fontFamily: 'Fraunces, serif',
              }}>
                {nomeTerapeuta ? nomeTerapeuta.charAt(0).toUpperCase() : 'T'}
              </div>
            )}
          </div>

          {/* Nome e credenciais */}
          <div style={{ flex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Terapeuta Ocupacional
            </p>
            <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, fontFamily: 'Fraunces, serif', margin: '0 0 4px', lineHeight: 1.1 }}>
              {nomeTerapeuta || 'Nome do Terapeuta'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0 }}>
              {crfto ? `CRF/TO: ${crfto}` : ''}
              {crfto && localStr ? '  ·  ' : ''}
              {localStr}
            </p>
          </div>

          {/* Badge tipo */}
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            padding: '8px 14px',
            textAlign: 'right',
            flexShrink: 0,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 3px' }}>
              Tipo de documento
            </p>
            <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700, margin: 0 }}>
              {tipoLabel}
            </p>
          </div>
        </div>

        {/* Divisória */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '16px' }} />

        {/* Título */}
        <p style={{
          color: '#ffffff', fontSize: '12px', fontWeight: 700,
          letterSpacing: '2px', textTransform: 'uppercase',
          textAlign: 'center', fontFamily: 'Fraunces, serif',
          margin: '0 0 16px',
        }}>
          Relatório Clínico de Terapia Ocupacional
        </p>

        {/* Metadados — tabela simples sem grid */}
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '12px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 16px 4px 0', verticalAlign: 'top', width: '33%' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 2px' }}>Paciente</p>
                  <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, margin: 0 }}>{nomePaciente}</p>
                </td>
                <td style={{ padding: '4px 16px 4px 0', verticalAlign: 'top', width: '33%' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 2px' }}>Período</p>
                  <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, margin: 0 }}>{inicio} a {fim}</p>
                </td>
                <td style={{ padding: '4px 0', verticalAlign: 'top', width: '33%' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 2px' }}>Data de emissão</p>
                  <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, margin: 0 }}>{hoje}</p>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 16px 0 0', verticalAlign: 'top' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 2px' }}>CID-10 Principal</p>
                  <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, margin: 0 }}>{cidPrincipal}</p>
                </td>
                <td style={{ padding: '8px 16px 0 0', verticalAlign: 'top' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 2px' }}>Financiamento</p>
                  <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, margin: 0 }}>
                    {financiamento === 'convenio' ? 'Convênio / Plano de Saúde' : 'Particular'}
                  </p>
                </td>
                {tuss && financiamento === 'convenio' ? (
                  <td style={{ padding: '8px 0 0', verticalAlign: 'top' }}>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '8px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 2px' }}>Código TUSS</p>
                    <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, margin: 0 }}>{tuss}</p>
                  </td>
                ) : <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AVISO COFFITO ── */}
      <div style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef', padding: '8px 40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: col, flexShrink: 0 }} />
        <p style={{ fontSize: '9px', color: '#6c757d', margin: 0, lineHeight: 1.5 }}>
          Documento emitido em conformidade com as normas do <strong>COFFITO</strong> — Conselho Federal de Fisioterapia e Terapia Ocupacional.
          {financiamento === 'convenio' && ' Válido para apresentação a planos de saúde e perícias médicas.'}
        </p>
      </div>

      {/* ── CORPO ── */}
      <div style={{ padding: '32px 40px' }}>
        {!editando ? (
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h2 style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: col, borderBottom: `2px solid ${brandColors.light}`, paddingBottom: '5px', marginTop: '24px', marginBottom: '10px' }}>
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h2 style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: col, borderBottom: `2px solid ${brandColors.light}`, paddingBottom: '5px', marginTop: '24px', marginBottom: '10px' }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#495057', marginTop: '12px', marginBottom: '4px' }}>
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p style={{ fontSize: '12px', color: '#343a40', lineHeight: 1.8, marginBottom: '10px', margin: '0 0 10px' }}>
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong style={{ fontWeight: 600, color: '#212529' }}>{children}</strong>
              ),
              ul: ({ children }) => <ul style={{ margin: '0 0 12px', paddingLeft: 0, listStyle: 'none' }}>{children}</ul>,
              li: ({ children }) => (
                <li style={{ fontSize: '12px', color: '#343a40', display: 'flex', gap: '8px', lineHeight: 1.7, marginBottom: '4px' }}>
                  <span style={{ color: col, flexShrink: 0 }}>▸</span>
                  <span>{children}</span>
                </li>
              ),
              ol: ({ children }) => <ol style={{ paddingLeft: '18px', margin: '0 0 12px' }}>{children}</ol>,
              hr: () => <div style={{ height: '1px', background: '#e9ecef', margin: '16px 0' }} />,
              code: ({ children }) => <span style={{ color: '#495057' }}>{children}</span>,
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

      {/* ── RODAPÉ / ASSINATURA ── */}
      <div style={{ padding: '0 40px 40px' }}>
        <div style={{ borderTop: `2px solid ${col}`, paddingTop: '24px' }}>

          {/* Aviso de validação */}
          <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '3px', flexShrink: 0, background: col, borderRadius: '2px', alignSelf: 'stretch' }} />
            <p style={{ fontSize: '10px', color: '#495057', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: '#212529' }}>Documento sujeito à validação profissional.</strong>{' '}
              Este relatório deve ser conferido e assinado pelo Terapeuta Ocupacional responsável antes de qualquer utilização clínica, legal ou previdenciária.
            </p>
          </div>

          {/* Assinatura + Data */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: 'bottom' }}>
                  <img id="assinatura-preview" alt="Assinatura" style={{ display: 'none', height: '56px', marginBottom: '6px' }} />
                  <div style={{ width: '220px', borderBottom: '1.5px solid #adb5bd', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#212529', margin: '0 0 2px' }}>{nomeTerapeuta}</p>
                  <p style={{ fontSize: '10px', color: '#6c757d', margin: '0 0 1px' }}>Terapeuta Ocupacional</p>
                  {crfto && <p style={{ fontSize: '10px', color: '#6c757d', margin: 0 }}>CRF/TO: {crfto}</p>}
                </td>
                <td style={{ verticalAlign: 'bottom', textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#212529', margin: '0 0 4px' }}>{hoje}</p>
                  {localStr && <p style={{ fontSize: '10px', color: '#6c757d', margin: 0 }}>{localStr}</p>}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Mini rodapé */}
          <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '8px', color: '#adb5bd', margin: 0, letterSpacing: '0.5px' }}>
              TERAPÔ.PRO — SISTEMA DE GESTÃO CLÍNICA PARA TERAPEUTAS OCUPACIONAIS
            </p>
            <p style={{ fontSize: '8px', color: '#adb5bd', margin: 0 }}>
              Gerado em {hoje} · Confidencial
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
