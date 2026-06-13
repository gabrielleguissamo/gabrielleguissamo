import React from 'react'
import { formatarData } from '../../lib/formatDate'
import type { BrandColors } from '../../lib/brandColors'

interface RelatorioPDFLayoutProps {
  conteudo: string
  nomePaciente: string
  nomeTerapeuta: string
  crfto: string
  cidPrincipal: string
  financiamento: string
  tuss?: string
  periodoInicio: string
  periodoFim: string
  logoUrl?: string
  brandColors: BrandColors
  assinaturaUrl?: string
  id?: string
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700, color: '#111827' }}>{part.slice(2, -2)}</strong>
      : part
  )
}

function renderConteudo(texto: string, brandColors: BrandColors): React.ReactNode[] {
  const lines = texto.split('\n')
  const out: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^#{1,2}\s/.test(line)) {
      const title = line.replace(/^#{1,2}\s/, '')
      out.push(
        <div key={i} style={{
          fontSize: '7.5px', fontWeight: 700, color: brandColors.primary,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginTop: '10px', marginBottom: '3px',
          paddingBottom: '2px', borderBottom: `1px solid ${brandColors.light}`,
        }}>{title}</div>
      )
    } else if (/^###\s/.test(line)) {
      out.push(
        <div key={i} style={{ fontSize: '8px', fontWeight: 600, color: '#374151', marginTop: '5px', marginBottom: '2px' }}>
          {line.replace('### ', '')}
        </div>
      )
    } else if (/^[-*]\s/.test(line)) {
      out.push(
        <div key={i} style={{ fontSize: '8px', color: '#374151', lineHeight: 1.4, marginBottom: '1px', display: 'flex', gap: '4px' }}>
          <span style={{ color: brandColors.primary, flexShrink: 0, marginTop: '1px' }}>▸</span>
          <span>{renderInline(line.replace(/^[-*]\s/, ''))}</span>
        </div>
      )
    } else if (line.trim() === '' || line.trim() === '---') {
      // skip
    } else {
      out.push(
        <p key={i} style={{ fontSize: '8px', color: '#374151', lineHeight: 1.45, marginBottom: '2px', marginTop: 0 }}>
          {renderInline(line)}
        </p>
      )
    }
    i++
  }
  return out
}

export function RelatorioPDFLayout({
  conteudo, nomePaciente, nomeTerapeuta, crfto,
  cidPrincipal, financiamento, tuss, periodoInicio, periodoFim,
  logoUrl, brandColors, assinaturaUrl, id = 'relatorio-pdf-layout',
}: RelatorioPDFLayoutProps) {
  const hoje = formatarData(new Date())
  const inicio = periodoInicio ? formatarData(periodoInicio) : hoje
  const fim = periodoFim ? formatarData(periodoFim) : hoje

  const meta = [
    { label: 'Paciente', value: nomePaciente },
    { label: 'Período', value: `${inicio} a ${fim}` },
    { label: 'CID-10', value: cidPrincipal },
    { label: 'Financiamento', value: financiamento === 'convenio' ? `Convênio${tuss ? ` — TUSS: ${tuss}` : ''}` : 'Particular' },
    { label: 'Emissão', value: hoje },
  ]

  return (
    <div
      id={id}
      style={{
        width: '794px',
        backgroundColor: '#ffffff',
        fontFamily: "'Montserrat', 'Arial', sans-serif",
        fontSize: '8px',
        color: '#374151',
        padding: '24px 30px 20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Cabeçalho */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColors.primary}10, ${brandColors.light})`,
        borderRadius: '8px', padding: '12px 16px 10px', marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flexShrink: 0 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="" crossOrigin="anonymous" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
            ) : (
              <div style={{
                width: '40px', height: '40px', borderRadius: '8px',
                background: brandColors.light, border: `1px solid ${brandColors.primary}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '18px', color: brandColors.primary,
              }}>T</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#1f2937', fontSize: '9px' }}>{nomeTerapeuta}</div>
            <div style={{ color: '#6b7280', fontSize: '7px' }}>Terapeuta Ocupacional</div>
            <div style={{ color: '#6b7280', fontSize: '7px' }}>CRF/TO: {crfto}</div>
          </div>
        </div>

        <div style={{ height: '1.5px', background: brandColors.primary, marginBottom: '8px' }} />

        <div style={{
          textAlign: 'center', fontFamily: 'Fraunces, serif',
          fontWeight: 700, fontSize: '11px', color: brandColors.primary,
          letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: '8px',
        }}>
          Relatório Clínico de Terapia Ocupacional
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px 12px' }}>
          {meta.map(({ label, value }) => (
            <div key={label}>
              <div style={{ color: '#9ca3af', fontSize: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1px' }}>{label}</div>
              <div style={{ color: '#1f2937', fontSize: '7.5px', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Corpo */}
      <div style={{ marginBottom: '14px' }}>
        {renderConteudo(conteudo, brandColors)}
      </div>

      {/* Assinatura */}
      <div style={{ borderTop: `2px solid ${brandColors.primary}`, paddingTop: '10px', marginTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            {assinaturaUrl ? (
              <img src={assinaturaUrl} alt="Assinatura" style={{ height: '44px', marginBottom: '2px', display: 'block' }} />
            ) : (
              <div style={{ width: '160px', height: '1px', background: '#9ca3af', marginBottom: '4px' }} />
            )}
            <div style={{ fontSize: '8px', fontWeight: 700, color: '#1f2937' }}>{nomeTerapeuta}</div>
            <div style={{ fontSize: '7px', color: '#6b7280' }}>Terapeuta Ocupacional | CRF/TO: {crfto}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '7px', color: '#9ca3af' }}>Data: _____ / _____ / _____</div>
            <div style={{ fontSize: '7px', color: '#9ca3af', marginTop: '4px' }}>Local: _______________________</div>
          </div>
        </div>
        <div style={{
          marginTop: '8px', paddingTop: '5px',
          borderTop: `1px solid ${brandColors.light}`,
          textAlign: 'center', fontSize: '6px', color: '#d1d5db',
        }}>
          Documento emitido pelo Terapô.pro — {hoje}
        </div>
      </div>
    </div>
  )
}
